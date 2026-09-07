import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { nextQuestion } from "@/lib/services";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    const url = new URL(req.url);
    const excludeRaw = url.searchParams.get("exclude") ?? "";
    const exclude = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const question = await nextQuestion(student, exclude);
    if (question === null) {
      return ok({ status: "empty" });
    }
    return ok(question);
  } catch (e) {
    return handleApiError(e);
  }
}
