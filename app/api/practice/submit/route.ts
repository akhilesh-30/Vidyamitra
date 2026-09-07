import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/supabase/admin";
import { recordAttempt } from "@/lib/services";
import type { QuestionRow } from "@/lib/types";

export const runtime = "nodejs";

function parseOptions(q: QuestionRow): string[] {
  const raw = q.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  return [];
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    let body: { question_id?: unknown; selected_key?: unknown; time_taken_seconds?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      throw new ApiError("That answer didn't come through. Tap it again.");
    }

    const questionId = typeof body.question_id === "string" ? body.question_id : "";
    const selectedKey = typeof body.selected_key === "string" ? body.selected_key.toLowerCase() : "";
    if (!questionId || !selectedKey) {
      throw new ApiError("That answer didn't come through. Tap it again.");
    }

    const { data: question, error } = await getAdmin()
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();
    if (error || !question) {
      throw new ApiError("Couldn't find that question. Refresh and try again.", 404);
    }
    const q = question as QuestionRow;
    const options = parseOptions(q);
    const keyIndex = selectedKey.charCodeAt(0) - 97;
    if (keyIndex < 0 || keyIndex >= options.length) {
      throw new ApiError("That answer didn't come through. Tap it again.");
    }

    const rawTime = Number(body.time_taken_seconds);
    const timeTaken = Number.isFinite(rawTime) ? Math.min(600, Math.max(1, Math.round(rawTime))) : 1;
    const isCorrect = selectedKey === q.correct_option;

    await recordAttempt({ student, questionId, isCorrect, timeTakenSeconds: timeTaken });

    return ok({
      correct: isCorrect,
      correct_key: q.correct_option,
      correct_text: options[q.correct_option.charCodeAt(0) - 97] ?? "",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
