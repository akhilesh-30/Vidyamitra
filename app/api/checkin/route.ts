import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { ApiError } from "@/lib/errors";
import { createCheckin } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { student } = await requireStudent(req);
    let body: { mood_emoji?: unknown; note?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      throw new ApiError("That check-in didn't come through. Try again.");
    }

    const emoji = typeof body.mood_emoji === "string" && body.mood_emoji.trim() ? body.mood_emoji.trim().slice(0, 8) : null;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1200) : "";
    if (!emoji) {
      throw new ApiError("Pick the face that matches how you feel, so we know how your session went.");
    }

    const { checkin, escalated, escalation } = await createCheckin(student.id, emoji, note || null);
    return ok({ checkin, escalated, reason: escalation?.reason ?? null });
  } catch (e) {
    return handleApiError(e);
  }
}
