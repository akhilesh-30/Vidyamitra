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
}

export async function POST(req: Request): Promise<NextResponse> {
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

    if (!Number.isInteger(classLevel) || classLevel < 5 || classLevel > 12) {
      throw new ApiError("Choose your class from the list so we set up the right syllabus.");
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
      return NextResponse.json({ data: { student: data } });
    }

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

    return NextResponse.json({ data: { student: data } });
  } catch (e) {
    return handleApiError(e);
  }
}
