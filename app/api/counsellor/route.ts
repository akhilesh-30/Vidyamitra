import { handleApiError, ok, requireUser } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/supabase/admin";
import { counsellorOverview, setEscalationStatus, hasCounsellorRole } from "@/lib/services";
import type { EscalationRow, EscalationWithStudent } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Counsellor-only surface (F8). The role is read from app_metadata, which
 * only service-role/server code can change — a student cannot edit their own
 * app_metadata, so the gate can't be self-promoted past.
 */
function requireCounsellor(user: { app_metadata?: Record<string, unknown> }): void {
  const role = (user.app_metadata?.role) as string | null | undefined;
  if (!hasCounsellorRole(role)) {
    throw new ApiError("This area is for school counsellors only.", 403, "FORBIDDEN");
  }
}

interface UserMeta {
  auth_user_id: string | null;
  school: string | null;
  age: number | null;
}

/** Attach age/school from auth metadata; scope to the counsellor's school if set. */
async function enrichAndScope(rows: EscalationWithStudent[], counsellorSchool: string | null): Promise<(EscalationWithStudent & { school: string | null; age: number | null })[]> {
  const admin = getAdmin();
  const metaById = new Map<string, { school: string | null; age: number | null }>();
  const ids = rows.map((r) => r.auth_user_id).filter((v): v is string => Boolean(v));
  if (ids.length > 0) {
    try {
      const { data } = await admin.auth.admin.listUsers({ perPage: 500 });
      for (const u of data?.users ?? []) {
        const m = (u.user_metadata ?? {}) as { school?: unknown; age?: unknown };
        metaById.set(u.id, {
          school: typeof m.school === "string" ? m.school : null,
          age: typeof m.age === "number" ? m.age : null,
        });
      }
    } catch (e) {
      console.error("Could not load user metadata for enrichment:", e);
    }
  }

  let enriched = rows.map((r) => {
    const meta = r.auth_user_id ? metaById.get(r.auth_user_id) : undefined;
    return { ...r, school: meta?.school ?? null, age: meta?.age ?? null };
  });

  if (counsellorSchool) {
    const schoolLower = counsellorSchool.trim().toLowerCase();
    const scoped = enriched.filter((r) => (r.school ?? "").toLowerCase() === schoolLower);
    // Don't hide cases from a counsellor whose school field doesn't match anything.
    enriched = scoped.length > 0 ? scoped : enriched;
  }
  return enriched;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    requireCounsellor(user);
    const meta = (user.user_metadata ?? {}) as { school?: unknown };
    const counsellorSchool = typeof meta.school === "string" ? meta.school : null;

    const overview = await counsellorOverview();
    const [openEscalations, reviewedEscalations] = await Promise.all([
      enrichAndScope(overview.openEscalations, counsellorSchool),
      enrichAndScope(overview.reviewedEscalations, counsellorSchool),
    ]);
    return ok({ ...overview, openEscalations, reviewedEscalations, counsellorSchool });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Move a case through the queue: open → reviewed → closed. */
export async function PATCH(req: Request): Promise<Response> {
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

// Exported for typing convenience in the console UI.
export type { UserMeta };

