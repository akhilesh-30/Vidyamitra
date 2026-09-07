import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { finishSession } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    const result = await finishSession(student);
    return ok(result);
  } catch (e) {
    return handleApiError(e);
  }
}
