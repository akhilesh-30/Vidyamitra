import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAdmin } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/errors";
import type { StudentRow } from "@/lib/types";

export function ok<T>(data: T, init?: number): NextResponse {
  return NextResponse.json({ data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error: { message, code } }, { status });
}

/** Pull the Supabase user out of the Authorization header, if valid. */
export async function authedUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser(req: Request): Promise<User> {
  const user = await authedUser(req);
  if (!user) {
    throw new ApiError("Your session has run out. Sign in again and you'll be right back.", 401, "UNAUTHENTICATED");
  }
  return user;
}

/** The signed-in student's row, or a signal to finish onboarding first. */
export async function requireStudent(req: Request): Promise<{ user: User; student: StudentRow }> {
  const user = await requireUser(req);
  const { data, error } = await getAdmin()
    .from("students")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw new ApiError("Something went wrong reaching your profile. Try again in a moment.", 502);
  if (!data) {
    throw new ApiError(
      "Almost there — we just need to know your class and board before you start.",
      409,
      "NO_PROFILE"
    );
  }
  return { user, student: data as StudentRow };
}

/** Route handlers only; converts thrown ApiErrors into JSON responses. */
export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return fail(e.message, e.status, e.code);
  }
  console.error("Unhandled API error:", e);
  return fail("Something unexpected went wrong. Please try again in a moment.", 500);
}
