import { NextResponse } from "next/server";
import { handleApiError, ok, requireUser } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { counsellorOverview, setEscalationStatus, hasCounsellorRole } from "@/lib/services";
import type { EscalationRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Counsellor-only surface (F8). The role is read from app_metadata, which
 * only service-role/server code can change — a student cannot edit their own
 * app_metadata, so the gate can't be self-promoted past.
 */
function requireCounsellor(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): void {
  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | null | undefined;
  if (!hasCounsellorRole(role)) {
    throw new ApiError("This area is for school counsellors only.", 403, "FORBIDDEN");
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    requireCounsellor(user);
    const overview = await counsellorOverview();
    return ok(overview);
  } catch (e) {
    return handleApiError(e);
  }
}

/** Move a case through the queue: open → reviewed → closed. */
export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    requireCounsellor(user);
    let body: { id?: unknown; status?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      throw new ApiError("That request didn't come through. Try again.");
    }
    const id = typeof body.id === "string" ? body.id : null;
    const status = body.status;
    if (!id) throw new ApiError("Which case is this? The case id was missing from the request.");
    if (status !== "reviewed" && status !== "closed" && status !== "open") {
      throw new ApiError("Status has to be one of: open, reviewed, closed.");
    }
    await setEscalationStatus(id, status as EscalationRow["status"]);
    return ok({ id, status });
  } catch (e) {
    return handleApiError(e);
  }
}
