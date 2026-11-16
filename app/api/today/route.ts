import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { getAdmin } from "@/lib/supabase/admin";
import { ensureCurriculumSynced, fetchMasteryFor } from "@/lib/curriculum/sync";
import { getSubjects, SUBJECT_LABEL, type BoardId } from "@/lib/curriculum";
import { generateDailyTasks, dateKeyIST } from "@/lib/tasks";
import { getLatestStress } from "@/lib/services";
import { moodScore } from "@/lib/moods";

export const runtime = "nodejs";

function istDayKey(iso: string): string {
  return dateKeyIST(new Date(iso));
}

function computeStreak(days: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // allow today or yesterday to start the streak (yesterday keeps it alive in the morning)
  if (!days.has(dateKeyIST(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (!days.has(dateKeyIST(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { student } = await requireStudent(req);
    const board = student.board as BoardId;
    const grade = student.class_level;
    const admin = getAdmin();
    const today = dateKeyIST();
    const since = new Date(Date.now() - 13 * 24 * 3_600_000).toISOString();

    const [moodRows, attemptRows, stress] = await Promise.all([
      admin
        .from("checkins")
        .select("id, mood_emoji, note, created_at")
        .eq("student_id", student.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(40),
      admin
        .from("attempts")
        .select("id, is_correct, attempted_at")
        .eq("student_id", student.id)
        .gte("attempted_at", since)
        .order("attempted_at", { ascending: false })
        .limit(200),
      getLatestStress(student.id),
    ]);
    if (moodRows.error) throw new Error(moodRows.error.message);

    const moods = (moodRows.data ?? []) as { id: string; mood_emoji: string | null; note: string | null; created_at: string }[];
    const attempts = (attemptRows.data ?? []) as { id: string; is_correct: boolean | null; attempted_at: string }[];

    // --- mood + streaks ---
    const moodDays = new Map<string, { emoji: string | null; note: string | null }>();
    for (const m of moods) {
      const key = istDayKey(m.created_at);
      if (!moodDays.has(key)) moodDays.set(key, { emoji: m.mood_emoji, note: m.note });
    }
    const todayMood = moodDays.get(today) ?? null;

    const activeDays = new Set<string>([...moodDays.keys()]);
    for (const a of attempts) activeDays.add(istDayKey(a.attempted_at));
    const streak = computeStreak(activeDays);

    const moodSeries = [] as { date: string; emoji: string | null }[];
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKeyIST(d);
      moodSeries.push({ date: key, emoji: moodDays.get(key)?.emoji ?? null });
    }

    // --- accuracy over visible attempts ---
    const scored = attempts.filter((a) => a.is_correct !== null);
    const accuracy = scored.length ? scored.filter((a) => a.is_correct).length / scored.length : null;

    // --- weakest & next topics from curriculum mastery ---
    const { subjects: subjectMap, topics: topicMap } = await ensureCurriculumSynced(board, grade);
    const mastery = await fetchMasteryFor(student.id, [...topicMap.values()]);
    const codeToMastery = new Map<string, number | null>();
    for (const [code, uuid] of topicMap) codeToMastery.set(code, mastery.get(uuid) ?? null);

    interface TopicRef { code: string; name: string; chapter: string; subject: string; mastery: number | null }
    const all: TopicRef[] = [];
    for (const cur of getSubjects(board, grade)) {
      for (const chapter of cur.chapters) {
        chapter.topics.forEach((name, i) => {
          const code = `${chapter.id}-t${i + 1}`;
          all.push({ code, name, chapter: chapter.name, subject: SUBJECT_LABEL[cur.id], mastery: codeToMastery.get(code) ?? null });
        });
      }
    }
    const started = all.filter((t) => t.mastery !== null);
    const weak = [...started].filter((t) => (t.mastery ?? 0) < 0.7).sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0)).slice(0, 6);
    const fresh = all.filter((t) => t.mastery === null);
    const next = (fresh.length ? fresh : all.slice().reverse()).slice(0, 6);
    const masteredCount = started.filter((t) => (t.mastery ?? 0) >= 0.85).length;
    const overall = all.length ? all.reduce((acc, t) => acc + (t.mastery ?? 0), 0) / all.length : 0;

    // --- daily tasks (deterministic per day) ---
    const tasks = generateDailyTasks({
      dateKey: today,
      moodToday: todayMood?.emoji ? moodScore(todayMood.emoji) : null,
      stress: stress?.stress_score ?? null,
      weakTopics: weak.slice(0, 3).map((t) => ({ name: t.name, chapter: t.chapter, mastery: t.mastery })),
      nextTopics: next.slice(0, 3).map((t) => ({ name: t.name, chapter: t.chapter })),
    });

    return ok({
      student,
      today,
      todayMood: todayMood ? { emoji: todayMood.emoji, note: todayMood.note } : null,
      moodSeries,
      streak,
      attempts7d: attempts.length,
      accuracy,
      masteredCount,
      totalTopics: all.length,
      overall,
      weak: weak.map((t) => ({ id: t.code, name: t.name, chapter: t.chapter, subject: t.subject, mastery: t.mastery })),
      next: next.map((t) => ({ id: t.code, name: t.name, chapter: t.chapter, subject: t.subject })),
      stress: stress ? { score: stress.stress_score, signals: stress.signals, at: stress.logged_at } : null,
      tasks,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
