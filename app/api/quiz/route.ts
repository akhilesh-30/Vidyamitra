import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/supabase/admin";
import { ensureCurriculumSynced } from "@/lib/curriculum/sync";
import { resolveTopicId } from "@/lib/curriculum";
import { groqChat, parseJsonLoose, rateLimit } from "@/lib/ai/groq";
import { recomputeMastery } from "@/lib/services";
import type { QuestionRow } from "@/lib/types";

export const runtime = "nodejs";

interface GeneratedQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty?: number;
}

const toLetter = (i: number): string => String.fromCharCode(97 + i);

function safeOptions(q: Pick<QuestionRow, "options">): string[] {
  const raw = q.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, string>;
    return Object.keys(obj).sort().map((k) => obj[k]);
  }
  return [];
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { student, user } = await requireStudent(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "generate");

    /* ---------- 1) generate: AI questions for a topic (or whole chapter) ---------- */
    if (action === "generate" || action === "generate-chapter") {
      if (!rateLimit(`quiz:${user.id}`, 20, 60_000)) {
        throw new ApiError("You're making questions faster than Mitra can think. Take a 30-second breather and try again.", 429, "RATE_LIMITED");
      }

      const count = Math.min(Math.max(Number(body.count ?? 5), 1), 12);
      const admin = getAdmin();
      const { topics: topicMap } = await ensureCurriculumSynced(student.board as never, student.class_level);

      let topicCodeIds: string[];
      let contextDescription: string;
      if (action === "generate") {
        const topic = resolveTopicId(String(body.topicId ?? ""));
        if (!topic) throw new ApiError("That topic doesn't exist in your syllabus.");
        topicCodeIds = [`${topic.chapter.id}-t${topic.topicIndex + 1}`];
        contextDescription = `subject: ${topic.subjectName}; chapter: "${topic.chapter.name}"; topic: "${topic.topicName}"`;
      } else {
        const chapterCodeId = String(body.chapterId ?? "");
        const probe = resolveTopicId(`${chapterCodeId}-t1`);
        if (!probe) throw new ApiError("That chapter doesn't exist in your syllabus.");
        topicCodeIds = probe.chapter.topics.map((_, i) => `${chapterCodeId}-t${i + 1}`);
        contextDescription = `subject: ${probe.subjectName}; chapter: "${probe.chapter.name}" (all topics: ${probe.chapter.topics.join(", ")})`;
      }

      const uuids = topicCodeIds.map((c) => topicMap.get(c)!).filter(Boolean);

      // Reuse already-saved questions first (saves AI quota, keeps scoring stable).
      const { data: existing } = await admin
        .from("questions")
        .select("*")
        .in("topic_id", uuids)
        .limit(60);
      const pool = (existing ?? []) as QuestionRow[];

      if (pool.length >= count) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
        return ok({
          questions: shuffled.map((q) => ({
            id: q.id,
            question: q.question_text,
            options: safeOptions(q),
            difficulty: q.difficulty ?? 1,
            explanation: null as string | null,
          })),
          source: "bank",
        });
      }

      // Ask Groq for fresh questions.
      const prompt = `You are an experienced Indian school teacher creating a quick MCQ quiz for a Class ${student.class_level} student on the ${student.board} board.
Context — ${contextDescription}.
Write exactly ${count} multiple-choice questions testing real understanding (not trivia). Each question must have exactly 4 options, one correct answer, a one-two sentence explanation of why the answer is right, and a difficulty 1-3 (1 easy, 3 hard).
Language: simple, warm, age-appropriate English (Class ${student.class_level} level). Avoid trick questions.
Reply with ONLY JSON: {"questions":[{"question":"...","options":["a","b","c","d"],"answerIndex":0,"explanation":"...","difficulty":1}]}`;

      const raw = await groqChat(
        [
          { role: "system", content: "You generate high-quality school MCQ quizzes as strict JSON only." },
          { role: "user", content: prompt },
        ],
        { json: true, temperature: 0.7, maxTokens: 2400 }
      );
      const parsed = parseJsonLoose<{ questions?: GeneratedQuestion[] }>(raw);
      const list = (parsed?.questions ?? []).filter(
        (q) =>
          q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.answerIndex === "number" && q.answerIndex >= 0 && q.answerIndex < 4
      );
      if (list.length === 0) {
        throw new ApiError("Mitra couldn't craft questions for this topic right now. Please try again in a moment.", 502, "AI_UNAVAILABLE");
      }

      // Save into the questions table (keeps the attempts/mastery machinery intact).
      const saved: { id: string; question: string; options: string[]; difficulty: number; explanation: string }[] = [];
      for (const q of list.slice(0, count)) {
        const topicUuid = uuids[saved.length % uuids.length];
        const { data, error } = await admin
          .from("questions")
          .insert({
            topic_id: topicUuid,
            question_text: q.question.slice(0, 800),
            options: q.options.map((o) => String(o).slice(0, 300)),
            correct_option: toLetter(q.answerIndex),
            difficulty: Math.min(Math.max(q.difficulty ?? 1, 1), 3),
          })
          .select("id")
          .single();
        if (error) throw new ApiError("Couldn't save your quiz. Try once more.", 502);
        saved.push({
          id: String((data as { id: string }).id),
          question: q.question,
          options: q.options,
          difficulty: q.difficulty ?? 1,
          explanation: q.explanation ?? "",
        });
      }

      return ok({
        questions: saved.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        source: "ai",
      });
    }

    /* ---------- 2) answer: score one question, update mastery ---------- */
    if (action === "answer") {
      const questionId = String(body.questionId ?? "");
      const seconds = Math.min(Math.max(Number(body.timeTakenSeconds ?? 20), 0), 3600);
      if (!questionId) throw new ApiError("Which question was this? The id was missing.");

      const admin = getAdmin();
      const { data: q } = await admin
        .from("questions")
        .select("id, topic_id, correct_option, options")
        .eq("id", questionId)
        .maybeSingle();
      const question = q as Pick<QuestionRow, "id" | "topic_id" | "correct_option" | "options"> | null;
      if (!question) throw new ApiError("That question no longer exists.", 404);

      const letter = String(question.correct_option ?? "a").toLowerCase();
      const options = safeOptions(question);
      const correctIndex = Math.max(letter.charCodeAt(0) - 97, 0);

      // Correctness is decided here, on the server. The browser only ever sends
      // the option the student tapped — never whether it was right — so a quiz
      // score can't be forged from the console (and generated questions never
      // ship their answer to the client in the first place).
      const selectedIndex = Number(body.selectedIndex);
      const isCorrect = Number.isInteger(selectedIndex)
        ? selectedIndex === correctIndex
        : Boolean(body.isCorrect);

      const { error } = await admin.from("attempts").insert({
        student_id: student.id,
        question_id: questionId,
        is_correct: isCorrect,
        time_taken_seconds: Math.round(seconds),
      });
      if (error) throw new ApiError("Couldn't save your answer. It wasn't your fault — try once more.", 502);

      const updates = await recomputeMastery(student.id);
      const topicUpdate = updates.find((u) => u.topic_id === question.topic_id) ?? null;

      return ok({
        correctIndex,
        correctLetter: letter,
        correctText: options[correctIndex] ?? null,
        mastery: topicUpdate?.mastery ?? null,
        topicName: topicUpdate?.topic_name ?? null,
      });
    }

    throw new ApiError("Unknown quiz action.");
  } catch (e) {
    return handleApiError(e);
  }
}