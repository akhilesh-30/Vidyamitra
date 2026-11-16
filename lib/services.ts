import "server-only";
import { getAdmin } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/errors";
import { computeTopicMastery } from "@/lib/compute/mastery";
import { assessStress, type StressAttempt } from "@/lib/compute/stress";
import { buildAdaptivePlan } from "@/lib/compute/adaptive";
import { evaluateCheckin, SAD_EMOJIS } from "@/lib/flagging";
import { hoursAgo } from "@/lib/time";
import { ensureCurriculumSynced } from "@/lib/curriculum/sync";
import type {
  StudentRow,
  SubjectRow,
  TopicRow,
  TopicWithContent,
  ContentLinkRow,
  MasteryScoreRow,
  StressLogRow,
  QuestionRow,
  AttemptRow,
  StressResult,
  MasteryUpdate,
  AdaptivePlan,
  StressLevel,
  CheckinRow,
  EscalationRow,
  EscalationWithStudent,
  PracticeQuestion,
} from "@/lib/types";

const admin = () => getAdmin();

/* ---------------- syllabus & state assembly ---------------- */

export interface SubjectSyllabus {
  subject: SubjectRow;
  topics: TopicWithContent[];
}

/** Subjects → topics (in syllabus order) → content links for this student's board/class. */
export async function getSyllabus(student: StudentRow): Promise<SubjectSyllabus[]> {
  // Mirror the code curriculum into the DB the first time a student needs it,
  // so the plan/practice/progress surfaces see the same topics as Learn.
  await ensureCurriculumSynced(student.board, student.class_level).catch((e) => {
    console.error("Curriculum sync failed:", e);
  });

  const { data: subjects, error: subErr } = await admin()
    .from("subjects")
    .select("*")
    .eq("board", student.board)
    .eq("class_level", student.class_level)
    .order("name");

  if (subErr) throw new ApiError("Couldn't load your syllabus. Try again in a moment.", 502);
  if (!subjects || subjects.length === 0) return [];

  const subjectIds = subjects.map((s: SubjectRow) => s.id);
  const { data: topics, error: topErr } = await admin()
    .from("topics")
    .select("*")
    .in("subject_id", subjectIds)
    .order("sequence");

  if (topErr) throw new ApiError("Couldn't load your syllabus. Try again in a moment.", 502);
  const topicIds = (topics ?? []).map((t: TopicRow) => t.id);

  const { data: links, error: linkErr } = topicIds.length
    ? await admin().from("content_links").select("*").in("topic_id", topicIds)
    : { data: [], error: null };
  if (linkErr) throw new ApiError("Couldn't load your materials. Try again in a moment.", 502);

  const { data: masteryRows, error: masErr } = topicIds.length
    ? await admin()
        .from("mastery_scores")
        .select("*")
        .eq("student_id", student.id)
        .in("topic_id", topicIds)
    : { data: [], error: null };
  if (masErr) throw new ApiError("Couldn't load your progress. Try again in a moment.", 502);

  const linksByTopic = new Map<string, TopicWithContent["contentLinks"]>();
  for (const l of links as ContentLinkRow[]) {
    const list = linksByTopic.get(l.topic_id) ?? [];
    list.push({ id: l.id, type: l.type, title: l.title, url: l.url });
    linksByTopic.set(l.topic_id, list);
  }
  const masteryByTopic = new Map<string, MasteryScoreRow>();
  for (const m of masteryRows as MasteryScoreRow[]) masteryByTopic.set(m.topic_id, m);

  const bySubject = new Map<string, SubjectSyllabus>();
  for (const s of subjects as SubjectRow[]) {
    bySubject.set(s.id, { subject: s, topics: [] });
  }
  for (const t of (topics ?? []) as TopicRow[]) {
    const m = masteryByTopic.get(t.id);
    bySubject.get(t.subject_id)?.topics.push({
      topic: t,
      mastery: m ? m.mastery : null,
      updated_at: m ? m.updated_at : null,
      contentLinks: linksByTopic.get(t.id) ?? [],
    });
  }
  return [...bySubject.values()];
}

export async function getLatestStress(studentId: string): Promise<StressLogRow | null> {
  const { data, error } = await admin()
    .from("stress_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError("Couldn't read how today is going. Try again in a moment.", 502);
  return (data as StressLogRow) ?? null;
}

export async function getStressHistory(studentId: string, days = 30): Promise<StressLogRow[]> {
  const from = new Date(Date.now() - days * 24 * 3_600_000).toISOString();
  const { data, error } = await admin()
    .from("stress_logs")
    .select("*")
    .eq("student_id", studentId)
    .gte("logged_at", from)
    .order("logged_at", { ascending: true });
  if (error) throw new ApiError("Couldn't read your wellness history. Try again in a moment.", 502);
  return (data ?? []) as StressLogRow[];
}

export function topicStatesFromSyllabus(syllabus: SubjectSyllabus[]) {
  return syllabus.flatMap((s) =>
    s.topics.map((t) => ({
      topic: {
        id: t.topic.id,
        name: t.topic.name,
        sequence: t.topic.sequence ?? 0,
      },
      mastery: t.mastery,
      updated_at: t.updated_at,
    }))
  );
}

/** The day's plan: quota + topic queue, shaped by real mastery & stress rows. */
export async function getTodayPlan(student: StudentRow): Promise<AdaptivePlan & { pendingSyllabus: number }> {
  const syllabus = await getSyllabus(student);
  const stress = await getLatestStress(student.id);
  const plan = buildAdaptivePlan(
    topicStatesFromSyllabus(syllabus),
    stress ? stress.stress_score : null,
    new Date().toISOString()
  );
  const pendingSyllabus = syllabus.reduce(
    (acc, s) =>
      acc + s.topics.filter((t) => t.mastery === null || t.mastery < 0.7).length,
    0
  );
  return { ...plan, pendingSyllabus };
}

/* ---------------- practice (F3/F4) ---------------- */

function parseOptions(q: QuestionRow): string[] {
  const raw = q.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (raw && typeof raw === "object") {
    // tolerate {a: "...", b: "..."} maps
    const obj = raw as Record<string, string>;
    return Object.keys(obj)
      .sort()
      .map((k) => obj[k]);
  }
  return [];
}

function toLetter(i: number): string {
  return String.fromCharCode(97 + i); // a, b, c…
}

async function attemptHistoryForQuestions(
  studentId: string,
  questionIds: string[]
): Promise<Map<string, string[]>> {
  if (questionIds.length === 0) return new Map();
  const { data, error } = await admin()
    .from("attempts")
    .select("question_id, attempted_at")
    .eq("student_id", studentId)
    .in("question_id", questionIds)
    .order("attempted_at", { ascending: true });
  if (error) throw new ApiError("Couldn't pick your next question. Try again in a moment.", 502);
  const rows = (data ?? []) as { question_id: string; attempted_at: string }[];
  const map = new Map<string, string[]>();
  for (const a of rows) {
    const list = map.get(a.question_id) ?? [];
    list.push(a.attempted_at);
    map.set(a.question_id, list);
  }
  return map;
}

/**
 * Serve the next question. target topic = plan queue head, except review
 * picks the question with the longest gap. Prefer fresh questions, then the
 * oldest-revisited ones.
 */
export async function nextQuestion(
  student: StudentRow,
  excludeQuestionIds: string[],
  nowIso: string = new Date().toISOString()
): Promise<PracticeQuestion | { done: true; doneReason: string } | null> {
  const plan = await getTodayPlan(student);
  if (plan.queue.length === 0) {
    return {
      done: true,
      doneReason:
        "Everything you've covered is mastered and spaced review isn't due yet. That's a good place to be — come back tomorrow.",
    };
  }

  // Pick the first queue topic that still has a question this session hasn't
  // seen; fall back to repeats only when every due topic is exhausted.
  let target: (typeof plan.queue)[number] | null = null;
  let all: QuestionRow[] = [];
  let pool: QuestionRow[] = [];
  for (const item of plan.queue) {
    const { data: questions, error } = await admin()
      .from("questions")
      .select("*")
      .eq("topic_id", item.topic_id)
      .order("difficulty");
    if (error) throw new ApiError("Couldn't find practice questions. Try again in a moment.", 502);
    const qs = (questions ?? []) as QuestionRow[];
    if (qs.length === 0) continue;
    const freshForTopic = qs.filter((q) => !excludeQuestionIds.includes(q.id));
    if (freshForTopic.length > 0 || !target) {
      target = item;
      all = qs;
      pool = freshForTopic.length > 0 ? freshForTopic : qs;
    }
    if (freshForTopic.length > 0) break;
  }
  if (!target) {
    return {
      done: true,
      doneReason:
        "Nothing is due right now. Everything you've covered is steady — come back later today or tomorrow.",
    };
  }

  const history = await attemptHistoryForQuestions(student.id, pool.map((q) => q.id));

  const desired = target.mastery === null ? 1 : target.mastery < 0.5 ? 1 : target.mastery < 0.85 ? 2 : 3;
  const scored = pool
    .map((q) => {
      const seen = history.get(q.id) ?? [];
      const recencyPenalty = seen.length > 0 ? -((new Date(nowIso).getTime() - new Date(seen[seen.length - 1]).getTime()) / 3_600_000) : 1e9;
      const difficultyFit = q.difficulty === desired ? 100 : q.difficulty === desired - 1 || q.difficulty === desired + 1 ? 60 : 20;
      return { q, score: difficultyFit + Math.min(seen.length, 3) * -1 + Math.min(recencyPenalty, 1e6) };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = scored[0];
  if (!chosen) return null;

  const options = parseOptions(chosen.q);
  if (options.length === 0) return null;

  return {
    question_id: chosen.q.id,
    topic_id: chosen.q.topic_id,
    topic_name: target.name,
    question_text: chosen.q.question_text,
    options: options.map((text, i) => ({ key: toLetter(i), text })),
    index: excludeQuestionIds.length + 1,
    quota: plan.quota,
    correct_so_far: 0, // filled by the client via finish payloads
    total_so_far: 0,
  };
}

export async function recordAttempt(input: {
  student: StudentRow;
  questionId: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
}): Promise<AttemptRow> {
  const { data, error } = await admin()
    .from("attempts")
    .insert({
      student_id: input.student.id,
      question_id: input.questionId,
      is_correct: input.isCorrect,
      time_taken_seconds: input.timeTakenSeconds,
    })
    .select()
    .single();
  if (error) throw new ApiError("Couldn't save your answer. It wasn't your fault — try once more.", 502);
  return data as AttemptRow;
}

/* ---------------- derivation (F4 + F5) ---------------- */

interface AttemptForCompute extends StressAttempt {
  question_topic_id: string;
  difficulty: number;
}

type RawAttemptJoin = {
  is_correct: boolean;
  time_taken_seconds: number | null;
  attempted_at: string;
  questions: { difficulty: number; topic_id: string } | { difficulty: number; topic_id: string }[] | null;
};

async function fetchAttempts(studentId: string, hours: number): Promise<AttemptForCompute[]> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await admin()
    .from("attempts")
    .select("is_correct, time_taken_seconds, attempted_at, questions(difficulty, topic_id)")
    .eq("student_id", studentId)
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false });
  if (error) throw new ApiError("Couldn't read your recent answers. Try again in a moment.", 502);
  const rows = (data ?? []) as RawAttemptJoin[];
  const out: AttemptForCompute[] = [];
  for (const a of rows) {
    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions;
    if (!q) continue;
    out.push({
      is_correct: a.is_correct ?? false,
      time_taken_seconds: a.time_taken_seconds ?? null,
      attempted_at: a.attempted_at,
      question_topic_id: q.topic_id,
      difficulty: q.difficulty,
    });
  }
  return out;
}

/** Recompute + write mastery_scores for every topic the student has attempted. */
export async function recomputeMastery(studentId: string): Promise<MasteryUpdate[]> {
  const attempts = await fetchAttempts(studentId, 90 * 24);
  const byTopic = new Map<string, AttemptForCompute[]>();
  for (const a of attempts) {
    const list = byTopic.get(a.question_topic_id) ?? [];
    list.push(a);
    byTopic.set(a.question_topic_id, list);
  }

  const now = new Date().toISOString();
  const updates: MasteryUpdate[] = [];
  for (const [topicId, rows] of byTopic) {
    const { mastery } = computeTopicMastery(
      rows.map((r) => ({ is_correct: r.is_correct, attempted_at: r.attempted_at })),
      now
    );
    const existing = await admin()
      .from("mastery_scores")
      .select("*")
      .eq("student_id", studentId)
      .eq("topic_id", topicId)
      .maybeSingle();
    if (existing.error) throw new ApiError("Couldn't update mastery. Try again in a moment.", 502);
    if (existing.data) {
      await admin()
        .from("mastery_scores")
        .update({ mastery, updated_at: now })
        .eq("id", (existing.data as MasteryScoreRow).id);
    } else {
      await admin()
        .from("mastery_scores")
        .insert({ student_id: studentId, topic_id: topicId, mastery, updated_at: now });
    }
    const topicName = await topicNameOf(topicId);
    updates.push({ topic_id: topicId, topic_name: topicName, mastery });
  }
  return updates;
}

export async function topicNameOf(topicId: string): Promise<string> {
  const { data, error } = await admin().from("topics").select("name").eq("id", topicId).maybeSingle();
  if (error || !data) return "your recent topic";
  return (data as { name: string }).name;
}

/**
 * F5 — judge stress from the last 8 days of real attempts and write a
 * stress_logs row. Skips the write when there isn't enough recent behaviour
 * to say anything honest, and won't spam identical rows within 6 hours.
 */
export async function detectAndLogStress(studentId: string): Promise<{ result: StressResult | null; wrote: boolean }> {
  const attempts = await fetchAttempts(studentId, 8 * 24);
  const assessment = assessStress(
    attempts.map((a) => ({ is_correct: a.is_correct, time_taken_seconds: a.time_taken_seconds, attempted_at: a.attempted_at }))
  );
  if (assessment.score === null) return { result: null, wrote: false };

  const latest = await getLatestStress(studentId);
  if (latest && hoursAgo(latest.logged_at, new Date().toISOString()) < 6 && latest.stress_score === assessment.score) {
    return { result: { score: assessment.score, signals: assessment.signals }, wrote: false };
  }

  const { error } = await admin().from("stress_logs").insert({
    student_id: studentId,
    stress_score: assessment.score,
    signals: assessment.signals,
  });
  if (error) throw new ApiError("Couldn't save how your session went. Try again in a moment.", 502);
  return { result: { score: assessment.score, signals: assessment.signals }, wrote: true };
}

/** Full end-of-session derivation: mastery → stress → fresh plan. */
export async function finishSession(student: StudentRow): Promise<{
  masteryUpdates: MasteryUpdate[];
  stress: StressResult | null;
  plan: AdaptivePlan;
}> {
  const masteryUpdates = await recomputeMastery(student.id);
  const { result } = await detectAndLogStress(student.id);
  const plan = await getTodayPlan(student);
  return {
    masteryUpdates,
    stress: result,
    plan: { quota: plan.quota, quotaReason: plan.quotaReason, queue: plan.queue, skipped: plan.skipped },
  };
}

/** F4/F5 background job: derive mastery + stress for every student. */
export async function recomputeAllStudents(): Promise<{ students: number }> {
  const { data, error } = await admin().from("students").select("id, auth_user_id, name, class_level, board, created_at");
  if (error) throw new ApiError("Couldn't list students for recompute.", 502);
  const students = (data ?? []) as StudentRow[];
  for (const s of students) {
    await recomputeMastery(s.id).catch((e) => console.error(`mastery recompute failed for ${s.id}`, e));
    await detectAndLogStress(s.id).catch((e) => console.error(`stress recompute failed for ${s.id}`, e));
  }
  return { students: students.length };
}

/* ---------------- check-in + escalation (F7) ---------------- */

export async function createCheckin(
  studentId: string,
  moodEmoji: string | null,
  note: string | null
): Promise<{ checkin: CheckinRow; escalated: boolean; escalation?: EscalationRow }> {
  const { data: checkin, error } = await admin()
    .from("checkins")
    .insert({ student_id: studentId, mood_emoji: moodEmoji, note: note?.trim() || null })
    .select()
    .single();
  if (error || !checkin) throw new ApiError("Couldn't save your check-in. Try again in a moment.", 502);
  const row = checkin as CheckinRow;

  // Low check-ins in the recent past feed the "trend" rule.
  const { data: recent, error: recErr } = await admin()
    .from("checkins")
    .select("mood_emoji, created_at")
    .eq("student_id", studentId)
    .gte("created_at", new Date(Date.now() - 4 * 24 * 3_600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  if (recErr) throw new ApiError("Couldn't finish your check-in. Try again in a moment.", 502);

  const recentList = (recent ?? []) as { mood_emoji: string | null; created_at: string }[];
  const prevLow = recentList.filter((c) => c.created_at !== row.created_at && c.mood_emoji && SAD_EMOJIS.includes(c.mood_emoji)).length;

  const verdict = evaluateCheckin(row.note, row.mood_emoji, prevLow);
  if (!verdict.flagged) {
    return { checkin: row, escalated: false };
  }

  // Mark the check-in itself as flagged so the history stays honest even
  // when the escalation merges into an already-open case.
  const { data: flaggedRow, error: flagErr } = await admin()
    .from("checkins")
    .update({ flagged: true })
    .eq("id", row.id)
    .select()
    .single();
  if (flagErr || !flaggedRow) throw new ApiError("Couldn't finish your check-in. Try again in a moment.", 502);
  const flaggedCheckin = flaggedRow as CheckinRow;

  // If an open escalation already exists for this student, update it with the latest checkin & reason
  const { data: open, error: openErr } = await admin()
    .from("escalations")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openErr) throw new ApiError("Couldn't finish your check-in. Try again in a moment.", 502);

  if (open) {
    const newReason = verdict.reason ?? "Flagged for a counsellor to review.";
    const { data: updatedEsc, error: updateErr } = await admin()
      .from("escalations")
      .update({
        checkin_id: row.id,
        reason: newReason,
      })
      .eq("id", (open as EscalationRow).id)
      .select()
      .single();
    if (updateErr) throw new ApiError("Couldn't finish your check-in. Try again in a moment.", 502);
    return { checkin: flaggedCheckin, escalated: true, escalation: updatedEsc as EscalationRow };
  }

  const { data: esc, error: escErr } = await admin()
    .from("escalations")
    .insert({
      student_id: studentId,
      checkin_id: row.id,
      reason: verdict.reason ?? "Flagged for a counsellor to review.",
    })
    .select()
    .single();
  if (escErr) throw new ApiError("Couldn't finish your check-in. Try again in a moment.", 502);
  return { checkin: flaggedCheckin, escalated: true, escalation: esc as EscalationRow };
}

/* ---------------- counsellor data (F8) ---------------- */

export interface StressTrendPoint {
  date: string; // YYYY-MM-DD
  low: number;
  medium: number;
  high: number;
}

export interface ClassStressSummary {
  board: string;
  class_level: number;
  students: number;
  logs: number;
  recent_high: number;
}

export interface CounsellorOverview {
  openEscalations: EscalationWithStudent[];
  reviewedEscalations: EscalationWithStudent[];
  trend: StressTrendPoint[];
  byClass: ClassStressSummary[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function counsellorOverview(days = 14): Promise<CounsellorOverview> {
  const { data: students, error: sErr } = await admin().from("students").select("id, auth_user_id, name, class_level, board");
  if (sErr) throw new ApiError("Couldn't load class data.", 502);
  const studentRows = (students ?? []) as Pick<StudentRow, "id" | "auth_user_id" | "name" | "class_level" | "board">[];

  const { data: escalations, error: eErr } = await admin()
    .from("escalations")
    .select("id, student_id, checkin_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (eErr) throw new ApiError("Couldn't load escalations.", 502);

  const escalationRows = (escalations ?? []) as EscalationRow[];
  const checkinIds = escalationRows.map((e) => e.checkin_id).filter(Boolean) as string[];
  const { data: checkins, error: cErr } = checkinIds.length
    ? await admin().from("checkins").select("id, mood_emoji, note").in("id", checkinIds)
    : { data: [], error: null };
  if (cErr) throw new ApiError("Couldn't load check-in details.", 502);
  const checkinRows = (checkins ?? []) as { id: string; mood_emoji: string | null; note: string | null }[];
  const checkinById = new Map<string, { mood_emoji: string | null; note: string | null }>(
    checkinRows.map((c) => [c.id, c])
  );

  const byStudentId = new Map(studentRows.map((s) => [s.id, s]));
  const withStudent: EscalationWithStudent[] = escalationRows.map((e) => {
    const st = byStudentId.get(e.student_id);
    const ci = e.checkin_id ? checkinById.get(e.checkin_id) : undefined;
    return {
      ...e,
      auth_user_id: st?.auth_user_id ?? null,
      student_name: st?.name ?? "Unknown student",
      class_level: st?.class_level ?? 0,
      board: (st?.board ?? "CBSE") as StudentRow["board"],
      checkin_note: ci?.note ?? null,
      checkin_emoji: ci?.mood_emoji ?? null,
    };
  });

  // Stress trend per day across the whole board/class cohort.
  const fromIso = new Date(Date.now() - days * 24 * 3_600_000).toISOString();
  const { data: logs, error: lErr } = await admin()
    .from("stress_logs")
    .select("student_id, stress_score, logged_at")
    .gte("logged_at", fromIso)
    .order("logged_at", { ascending: true });
  if (lErr) throw new ApiError("Couldn't load stress trends.", 502);

  const bucket = new Map<string, StressTrendPoint>();
  const classStat = new Map<string, ClassStressSummary>();
  for (const row of logs ?? []) {
    const st = byStudentId.get(row.student_id as string);
    if (!st) continue;
    const key = dayKey(row.logged_at as string);
    const b = bucket.get(key) ?? { date: key, low: 0, medium: 0, high: 0 };
    b[row.stress_score as StressLevel] += 1;
    bucket.set(key, b);

    const ck = `${st.board}|${st.class_level}`;
    const cs = classStat.get(ck) ?? { board: st.board, class_level: st.class_level, students: 0, logs: 0, recent_high: 0 };
    cs.logs += 1;
    if (row.stress_score === "high") cs.recent_high += 1;
    classStat.set(ck, cs);
  }
  for (const s of studentRows) {
    const ck = `${s.board}|${s.class_level}`;
    const cs = classStat.get(ck) ?? { board: s.board, class_level: s.class_level, students: 0, logs: 0, recent_high: 0 };
    cs.students += 1;
    classStat.set(ck, cs);
  }

  return {
    openEscalations: withStudent.filter((e) => e.status === "open"),
    reviewedEscalations: withStudent.filter((e) => e.status !== "open").slice(0, 20),
    trend: [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date)),
    byClass: [...classStat.values()].sort((a, b) => a.class_level - b.class_level || a.board.localeCompare(b.board)),
  };
}

export async function setEscalationStatus(id: string, status: EscalationRow["status"]): Promise<void> {
  const { error } = await admin().from("escalations").update({ status }).eq("id", id);
  if (error) throw new ApiError("Couldn't update that case. Try again in a moment.", 502);
}

/** Counsellor role check: set in Supabase auth user metadata server-side. */
export function hasCounsellorRole(role: string | null | undefined): boolean {
  return role === "counsellor";
}
