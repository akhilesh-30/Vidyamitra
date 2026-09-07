import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { getSyllabus, getTodayPlan, getLatestStress } from "@/lib/services";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    const [syllabus, plan, latestStress] = await Promise.all([
      getSyllabus(student),
      getTodayPlan(student),
      getLatestStress(student.id),
    ]);
    return ok({ student, syllabus, plan, latestStress });
  } catch (e) {
    return handleApiError(e);
  }
}
