import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { getSyllabus, getStressHistory, getTodayPlan, topicStatesFromSyllabus } from "@/lib/services";
import { MASTERED_MASTERY } from "@/lib/compute/mastery";
import { getAdmin } from "@/lib/supabase/admin";
import { StressLevel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    const [syllabus, stressHistory, plan] = await Promise.all([
      getSyllabus(student),
      getStressHistory(student.id, 45),
      getTodayPlan(student),
    ]);

    const states = topicStatesFromSyllabus(syllabus);
    const total = states.length;
    const attempted = states.filter((s) => s.mastery !== null).length;
    const mastered = states.filter((s) => (s.mastery ?? 0) >= MASTERED_MASTERY).length;

    // Today's own practice, for the session summary at the top of /progress.
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: todayAttempts } = await getAdmin()
      .from("attempts")
      .select("is_correct, attempted_at")
      .eq("student_id", student.id)
      .gte("attempted_at", since);
    const rows = (todayAttempts ?? []) as { is_correct: boolean | null }[];
    const recent = {
      attempts_24h: rows.length,
      correct_24h: rows.filter((r) => r.is_correct === true).length,
    };

    return ok({
      syllabus,
      stressHistory: stressHistory.map((l) => ({
        logged_at: l.logged_at,
        stress_score: l.stress_score as StressLevel,
        signals: l.signals,
      })),
      plan: {
        quota: plan.quota,
        quotaReason: plan.quotaReason,
        queue: plan.queue,
        skipped: plan.skipped,
      },
      totals: { total, attempted, mastered, remaining: total - mastered },
      pendingSyllabus: plan.pendingSyllabus,
      recent,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
