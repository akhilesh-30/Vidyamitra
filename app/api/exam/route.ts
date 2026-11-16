import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/supabase/admin";
import { ensureCurriculumSynced } from "@/lib/curriculum/sync";
import { resolveTopicId } from "@/lib/curriculum";
import { groqChat, parseJsonLoose, rateLimit } from "@/lib/ai/groq";

export const runtime = "nodejs";

const toLetter = (i: number): string => String.fromCharCode(97 + i);

/** Cache exam notes per chapter for the server's lifetime (saves AI quota). */
const notesCache = new Map<string, { points: string[]; formulas: string[]; mnemonics: string[] }>();

export async function POST(req: Request): Promise<Response> {
  try {
    const { student, user } = await requireStudent(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "notes");

    const chapterCodeId = String(body.chapterId ?? "");
    const probe = resolveTopicId(`${chapterCodeId}-t1`);
    if (!probe) throw new ApiError("That chapter doesn't exist in your syllabus.");
    const { chapter, grade, subjectName, board } = probe;

    /* ---------- exam notes: AI revision bullets + formula sheet ---------- */
    if (action === "notes") {
      if (!rateLimit(`exam:${user.id}`, 30, 60_000)) {
        throw new ApiError("One moment — revision sheets are being prepared a touch too fast.", 429, "RATE_LIMITED");
      }
      const cached = notesCache.get(chapter.id);
      if (cached) return ok({ chapterId: chapter.id, chapterName: chapter.name, ...cached, source: "cache" });

      const topicsList = chapter.topics.join("; ");
      const raw = await groqChat(
        [
          { role: "system", content: "You write crisp, exam-focused revision notes for Indian school students (CBSE / Maharashtra board) as strict JSON only." },
          {
            role: "user",
            content: `Class ${grade}, ${board} board, subject: ${subjectName}, chapter: "${chapter.name}".
Topics covered: ${topicsList}.
Write revision material for a student who has 30 minutes before a test. Reply ONLY as JSON:
{"points": ["8-12 ultra-short revision bullets, one concept each, exam-phrased"],
 "formulas": ["every formula / definition / chemical equation worth memorising, with its meaning in brackets"],
 "mnemonics": ["2-4 memory tricks or common-mistake warnings"]}
Keep each string under 140 characters. Simple English.`,
          },
        ],
        { json: true, temperature: 0.5, maxTokens: 1600 }
      );
      const parsed = parseJsonLoose<{ points?: string[]; formulas?: string[]; mnemonics?: string[] }>(raw);
      const points = (parsed?.points ?? []).filter((p) => typeof p === "string" && p.trim()).slice(0, 12);
      const formulas = (parsed?.formulas ?? []).filter((p) => typeof p === "string" && p.trim()).slice(0, 12);
      const mnemonics = (parsed?.mnemonics ?? []).filter((p) => typeof p === "string" && p.trim()).slice(0, 4);

      const result = {
        points: points.length ? points : chapter.revision ?? chapter.topics.map((t) => `Revise: ${t}`),
        formulas: formulas.length ? formulas : chapter.formulas ?? [],
        mnemonics: mnemonics.length ? mnemonics : ["Read each question twice before answering — most marks are lost to misreads, not knowledge."],
      };
      notesCache.set(chapter.id, result);
      return ok({ chapterId: chapter.id, chapterName: chapter.name, ...result, source: "ai" });
    }

    /* ---------- exam test: timed chapter test ---------- */
    if (action === "test") {
      if (!rateLimit(`exam:${user.id}`, 12, 60_000)) {
        throw new ApiError("Your last test is still being set up. Give it a few seconds.", 429, "RATE_LIMITED");
      }
      const count = Math.min(Math.max(Number(body.count ?? 10), 5), 15);
      const admin = getAdmin();
      const { topics: topicMap } = await ensureCurriculumSynced(student.board as never, student.class_level);
      const uuids = chapter.topics.map((_, i) => topicMap.get(`${chapter.id}-t${i + 1}`)!).filter(Boolean);

      const raw = await groqChat(
        [
          { role: "system", content: "You generate board-style school MCQ tests as strict JSON only." },
          {
            role: "user",
            content: `Class ${grade}, ${board} board, subject: ${subjectName}, chapter: "${chapter.name}". Topics: ${chapter.topics.join("; ")}.
Create exactly ${count} exam-style MCQs mixing easy (difficulty 1) and challenging (difficulty 3) questions, like a real school test paper. Each has exactly 4 options, one correct answer, and a short explanation.
Reply ONLY as JSON: {"questions":[{"question":"...","options":["a","b","c","d"],"answerIndex":0,"explanation":"...","difficulty":1}]}`,
          },
        ],
        { json: true, temperature: 0.7, maxTokens: 3000 }
      );
      const parsed = parseJsonLoose<{ questions?: { question: string; options: string[]; answerIndex: number; explanation?: string; difficulty?: number }[] }>(raw);
      const list = (parsed?.questions ?? [])
        .filter(
          (q) =>
            q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 &&
            typeof q.answerIndex === "number" && q.answerIndex >= 0 && q.answerIndex < 4
        )
        .slice(0, count);
      if (list.length === 0) throw new ApiError("Lily Ai couldn't set this test right now. Please try again shortly.", 502, "AI_UNAVAILABLE");

      const out: { id: string; question: string; options: string[]; difficulty: number; explanation: string }[] = [];
      for (const [i, q] of list.entries()) {
        const topicUuid = uuids[i % uuids.length];
        const { data, error } = await admin
          .from("questions")
          .insert({
            topic_id: topicUuid,
            question_text: q.question.slice(0, 800),
            options: q.options.map((o) => String(o).slice(0, 300)),
            correct_option: toLetter(q.answerIndex),
            difficulty: Math.min(Math.max(q.difficulty ?? 2, 1), 3),
          })
          .select("id")
          .single();
        if (error) throw new ApiError("Couldn't set your test paper. Try once more.", 502);
        out.push({
          id: String((data as { id: string }).id),
          question: q.question,
          options: q.options,
          difficulty: q.difficulty ?? 2,
          explanation: q.explanation ?? "",
        });
      }

      return ok({
        chapterId: chapter.id,
        chapterName: chapter.name,
        durationMinutes: Math.max(6, Math.ceil(out.length * 1.2)),
        questions: out,
      });
    }

    throw new ApiError("Unknown exam action.");
  } catch (e) {
    return handleApiError(e);
  }
}