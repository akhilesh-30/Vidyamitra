import { NextResponse } from "next/server";
import { handleApiError, ok } from "@/lib/api/server";
import { requireStudent } from "@/lib/api/server";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    return ok({ student });
  } catch (e) {
    return handleApiError(e);
  }
}
