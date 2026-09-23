"use client";

/* The daily check-in card. Faces come from lib/moods.ts so the emoji sent to
   the server are byte-identical to the ones /api/today scores against. */

import { useState } from "react";
import { Check, HeartPulse, Loader2, Pencil, Wind } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { MOOD_FACES } from "@/lib/moods";
import { SectionHeading } from "@/components/ui";

interface SaveResult {
  escalated: boolean;
  reason: string | null;
}

export default function MoodCard({
  today,
  current,
  onSaved,
}: {
  today: string;
  current: { emoji: string | null; note: string | null } | null;
  onSaved: () => void;
}) {
  const [emoji, setEmoji] = useState<string | null>(current?.emoji ?? null);
  const [note, setNote] = useState(current?.note ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);

  const alreadyLogged = Boolean(current?.emoji) && !editing;

  async function save() {
    if (!emoji || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<SaveResult>("/api/checkin", {
        method: "POST",
        body: { mood_emoji: emoji, note },
      });
      setSaved(res);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That check-in didn't save. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <SectionHeading
        title="How are you, really?"
        hint="One tap. This reshapes today's plan — heavy days get lighter work."
        right={
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(240,178,90,0.1)] text-[var(--ember)]">
            <HeartPulse size={17} />
          </span>
        }
      />

      {alreadyLogged ? (
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(242,237,227,0.03)] p-4">
          <div className="flex items-center gap-3.5">
            <span className="text-[38px] leading-none">{current!.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold">
                Checked in · {MOOD_FACES.find((m) => m.emoji === current!.emoji)?.label ?? "Logged"}
              </p>
              <p className="faint mt-0.5 text-[12px]">Logged for {today}. You can change it any time.</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Update
            </button>
          </div>
          {current!.note ? (
            <p className="muted mt-3 border-t border-[var(--line)] pt-3 text-[13px] leading-relaxed">
              &ldquo;{current!.note}&rdquo;
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            {MOOD_FACES.map((m) => (
              <button
                key={m.emoji}
                type="button"
                title={m.label}
                aria-label={m.label}
                aria-pressed={emoji === m.emoji}
                onClick={() => setEmoji(m.emoji)}
                className={`mood-face ${emoji === m.emoji ? "selected" : ""}`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <p className="faint mt-2.5 text-[12px]">
            {emoji ? MOOD_FACES.find((m) => m.emoji === emoji)?.label : "Pick the one that's closest."}
          </p>

          <label className="label mt-4" htmlFor="mood-note">
            Want to say more? <span className="faint font-normal">(optional, only you and your counsellor)</span>
          </label>
          <textarea
            id="mood-note"
            className="input min-h-[76px] resize-y"
            maxLength={1200}
            placeholder="Tests this week, sleep, friends, anything on your mind…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error ? <p className="field-error mt-3">{error}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button type="button" className="btn btn-primary" disabled={!emoji || busy} onClick={() => void save()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={15} /> Save check-in</>}
            </button>
            {editing ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  setEmoji(current?.emoji ?? null);
                  setNote(current?.note ?? "");
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}

      {saved?.escalated ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-[rgba(224,139,139,0.32)] bg-[rgba(224,139,139,0.07)] p-3.5 text-[13px] leading-relaxed">
          <Wind size={15} className="mt-0.5 shrink-0 text-[var(--rose)]" />
          <span>
            Thank you for saying it honestly. Your school counsellor has been gently alerted — that&apos;s a person, not a
            punishment. If it feels urgent, Tele-MANAS is free on <strong>14416</strong>, any hour.
          </span>
        </p>
      ) : null}
    </section>
  );
}