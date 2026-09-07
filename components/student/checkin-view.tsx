"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, RequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { StudentShell } from "@/components/student-shell";
import { Button } from "@/components/controls";

/* --------------------------------------------------------------------
   Check-in (F7) — a mood, an optional note, and nothing forced.

   The app never counsels: when a note matches the flagging rules, the
   only thing that happens is a real human (the school counsellor) gets
   told. The copy here says exactly that, honestly and kindly, without
   diagnosing or alarming.
   -------------------------------------------------------------------- */

const MOODS: { emoji: string; label: string }[] = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😐", label: "So-so" },
  { emoji: "😔", label: "Low" },
  { emoji: "😭", label: "Really low" },
];

type Saved = { escalated: boolean; reason: string | null };

export function CheckinView() {
  const { state } = useAuth();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const submit = async () => {
    if (!mood || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<Saved>("/api/checkin", {
        method: "POST",
        body: { mood_emoji: mood, note: note.trim() || null },
      });
      setSaved(res);
    } catch (e) {
      setError(
        e instanceof RequestError && e.status !== 500
          ? e.message
          : "That didn't save. Nothing was lost — try once more."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ----- auth gates (same pattern as the other student pages) ----- */
  if (state.status === "loading") {
    return <div className="flex min-h-dvh items-center justify-center text-steel">Loading…</div>;
  }
  if (state.status === "anon" || state.status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink">Your session has run out. Sign in again and you'll be right back.</p>
        <Link href="/login" className="text-pine underline underline-offset-2">Go to sign-in</Link>
      </div>
    );
  }
  if (state.status === "no-profile") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink">Almost there — we just need to know your class and board before you start.</p>
        <Link href="/onboarding" className="text-pine underline underline-offset-2">Finish setting up</Link>
      </div>
    );
  }
  const student = state.student;

  /* ----- saved state ----- */
  if (saved) {
    return (
      <StudentShell student={student}>
        <div className="answer-reveal mx-auto max-w-lg py-12 text-center">
          <div className="text-[2.6rem] leading-none">{mood}</div>
          <h1 className="mt-3 font-display text-[1.6rem] font-semibold text-ink">
            Thanks for saying how you feel
          </h1>
          {saved.escalated ? (
            <p className="mt-3 text-[1rem] text-ink">
              What you wrote matters, so we told your school counsellor. They might check in with you — that's not
              trouble, it's support.
            </p>
          ) : (
            <p className="mt-3 text-[1rem] text-steel">
              Saved. Knowing this helps tomorrow's plan fit you better.
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-pine px-5 py-2.5 text-[0.95rem] font-semibold text-[#f6f8f4] hover:bg-pine-deep"
            >
              Back home
            </Link>
            <Link
              href="/practice"
              className="rounded-lg border border-line bg-card px-5 py-2.5 text-[0.95rem] font-semibold text-ink hover:bg-mist/50"
            >
              Practise something
            </Link>
          </div>
        </div>
      </StudentShell>
    );
  }

  /* ----- the form ----- */
  return (
    <StudentShell student={student}>
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-[2rem] font-semibold text-ink">How did today feel?</h1>
        <p className="mt-1 text-[0.98rem] text-steel">
          Pick the face closest to it. Write a little if you want — both are private between you and your school
          counsellor.
        </p>

        <div className="note-card mt-6 px-5 py-6">
          <fieldset>
            <legend className="text-[0.95rem] font-semibold text-ink">Your mood</legend>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {MOODS.map((m) => (
                <button
                  key={m.emoji}
                  type="button"
                  aria-pressed={mood === m.emoji}
                  onClick={() => setMood(m.emoji)}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border text-[1.5rem] transition-colors ${
                    mood === m.emoji
                      ? "border-pine bg-mist"
                      : "border-line bg-card hover:border-steel/40"
                  }`}
                >
                  {m.emoji}
                  <span className="sr-only">{m.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block">
            <span className="text-[0.95rem] font-semibold text-ink">Anything you want to add? (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1200}
              rows={4}
              placeholder="Today the maths felt…"
              className="mt-2 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[1rem] text-ink placeholder:text-steel/70 focus:border-pine focus:outline-none"
            />
            <span className="mt-1 block text-sm text-steel">
              If something feels too heavy to carry alone, writing it here tells a person who can help.
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-4 rounded-lg border border-rose/30 bg-rose/5 px-3.5 py-2.5 text-[0.95rem] text-rose">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            <Button onClick={() => void submit()} disabled={!mood || saving}>
              {saving ? "Saving…" : "Save how I feel"}
            </Button>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
