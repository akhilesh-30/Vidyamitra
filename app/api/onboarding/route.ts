import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { requireUser, handleApiError } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import type { StudentRow } from "@/lib/types";

export const runtime = "nodejs";

interface OnboardingBody {
  name?: unknown;
  class_level?: unknown;
  board?: unknown;
  age?: unknown;
  school?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser(req);
    let body: OnboardingBody;
    try {
      body = (await req.json()) as OnboardingBody;
    } catch {
      throw new ApiError("That didn't come through. Try again.");
    }

    const classLevel = Number(body.class_level);
    const board = typeof body.board === "string" ? body.board : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    const ageNumber = Number(body.age);
    const age = Number.isInteger(ageNumber) && ageNumber >= 8 && ageNumber <= 20 ? ageNumber : null;
    const school = typeof body.school === "string" ? body.school.trim().slice(0, 120) : null;

    if (!Number.isInteger(classLevel) || classLevel < 5 || classLevel > 10) {
      throw new ApiError("Choose your class from the list (5 to 10) so we set up the right syllabus.");
    }
    if (board !== "CBSE" && board !== "MAHARASHTRA") {
      throw new ApiError("Choose your board — CBSE or Maharashtra State Board.");
    }

    const admin = getAdmin();
    const { data: existing } = await admin
      .from("students")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let student: StudentRow;
    if (existing) {
      const { data, error } = await admin
        .from("students")
        .update({
          name: name || (existing as StudentRow).name,
          class_level: classLevel,
          board,
        })
        .eq("id", (existing as StudentRow).id)
        .select()
        .single();
      if (error) throw new ApiError("Couldn't update your profile. Try again in a moment.", 502);
      student = data as StudentRow;
    } else {
      const { data, error } = await admin
        .from("students")
        .insert({
          auth_user_id: user.id,
          name: name || null,
          class_level: classLevel,
          board,
        })
        .select()
        .single();
      if (error) throw new ApiError("Couldn't create your profile. Try again in a moment.", 502);
      student = data as StudentRow;
    }

    // age + school live in auth metadata (no schema change needed) — also
    // used later to connect students with their school counsellor.
    try {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { age, school },
      });
    } catch (metaErr) {
      console.error("Could not store user metadata:", metaErr);
    }

    return NextResponse.json({ data: { student } });
  } catch (e) {
    return handleApiError(e);
  }
}
