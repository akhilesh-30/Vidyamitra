import { handleApiError, ok, requireUser } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Counsellor registration: a shared access code (server env) is exchanged for
 * an app_metadata role, which only server code can set — a student can never
 * self-promote to counsellor.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { accessCode?: unknown; school?: unknown };
    const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";
    const school = typeof body.school === "string" ? body.school.trim().slice(0, 120) : "";

    const expected = process.env.COUNSELLOR_ACCESS_CODE ?? "";
    if (!expected) throw new ApiError("Counsellor registration isn't configured on this server.", 503, "NOT_CONFIGURED");
    if (!accessCode || accessCode !== expected) {
      throw new ApiError("That access code isn't right. Please check with your school coordinator.");
    }
    if (!school) throw new ApiError("Please enter your school's name exactly as students will type it.");

    const { error } = await getAdmin().auth.admin.updateUserById(user.id, {
      app_metadata: { role: "counsellor" },
      user_metadata: { school, role: "counsellor" },
    });
    if (error) throw new ApiError("Couldn't activate the counsellor account. Try again in a moment.", 502);

    return ok({ role: "counsellor", school });
  } catch (e) {
    return handleApiError(e);
  }
}