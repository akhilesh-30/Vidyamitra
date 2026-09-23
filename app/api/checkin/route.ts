import { NextResponse } from "next/server";
import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { getAdmin } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/errors";
import { createCheckin } from "@/lib/services";

export const runtime = "nodejs";

/** Mood history for the last 14 days + today's state. */
export async function GET(req: Request): Promise<Response> {
  try {
    const { student } = await requireStudent(req);
    const admin = getAdmin();
    const since = new Date(Date.now() - 13 * 24 * 3_600_000).toISOString();
    const { data, error } = await admin
      .from("checkins")
      .select("id, mood_emoji, note, flagged, created_at")
      .eq("student_id", student.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new ApiError("Couldn't load your check-in history. Try again in a moment.", 502);

    const rows = (data ?? []) as { id: string; mood_emoji: string | null; note: string | null; flagged: boolean; created_at: string }[];
    const byDay = new Map<string, { emoji: string | null; note: string | null; flagged: boolean }>();
    for (const r of rows) {
      const key = new Date(new Date(r.created_at).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, { emoji: r.mood_emoji, note: r.note, flagged: r.flagged });
    }
    const today = new Date(new Date().getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    const series = [] as { date: string; emoji: string | null; note: string | null; flagged: boolean }[];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(new Date().getTime() + 5.5 * 3_600_000 - i * 24 * 3_600_000).toISOString().slice(0, 10);
      const v = byDay.get(d);
      series.push({ date: d, emoji: v?.emoji ?? null, note: v?.note ?? null, flagged: v?.flagged ?? false });
    }
    return ok({ today, todayEntry: byDay.get(today) ?? null, series, total: rows.length });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request): Promise<Response> {
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
