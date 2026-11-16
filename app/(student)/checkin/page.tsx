"use client";

/* Check-in — one honest face a day. What you log here quietly reshapes
   tomorrow's plan; heavy days are flagged gently for extra support. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HeartPulse, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { ErrorNote, SectionHeading, Spinner } from "@/components/ui";
import MoodCard from "@/components/mood-card";

interface DayEntry { emoji: string | null; note: string | null; flagged: boolean; }
interface Series extends DayEntry { date: string; }
interface CheckinData { today: string; todayEntry: DayEntry | null; series: Series[]; total: number; }

export default function CheckinPage() {
  const [data, setData] = useState<CheckinData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [escalated, setEscalated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch<CheckinData>("/api/checkin");
      setData(res);
      setSelected(res.todayEntry?.emoji ?? null);
      setNote(res.todayEntry?.note ?? "");
      setSaved(Boolean(res.todayEntry));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your check-ins.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!selected || saving) return;
    setSaving(true); setError(null);
    try {
      const res = await apiFetch<{ escalated: boolean; reason: string | null }>("/api/checkin", {
        method: "POST",
        body: { mood_emoji: selected, note },
      });
      setSaved(true);
      setEscalated(res.escalated ? res.reason ?? "Today gets a little extra care from us." : null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your check-in.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!data) return <Spinner label="Opening your journal…" />;

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <span className="eyebrow"><span className="eyebrow-dot" /> Check-in</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">How is today sitting with you?</h1>
        <p className="muted mt-2 max-w-xl text-[14px]">One honest face a day. It quietly reshapes your study load — heavy days get lighter, good days can stretch a little.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <MoodCard
          selected={selected}
          onSelect={(emoji) => { setSelected(emoji); setEscalated(null); }}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1200}
          placeholder="Anything worth remembering about today? (optional)"
          className="mt-4 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--ink-2)] p-3 text-[14px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--line-strong)]"
        />
        <button type="button" className="btn btn-primary mt-3 w-full" disabled={!selected || saving} onClick={() => void submit()}>
          {saving ? "Saving…" : saved ? "Update today's check-in" : "Log today's check-in"}
        </button>

        {saved && !escalated && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--sage)]">
            <Sparkles size={14} /> Logged — thank you for showing up today.
          </p>
        )}
        {error && <div className="mt-3"><ErrorNote message={error} /></div>}

        {escalated && (
          <div className="mt-4 rounded-xl border border-[rgba(224,139,139,0.4)] bg-[rgba(224,139,139,0.08)] p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--rose)]">
              <HeartPulse size={15} /> We raised a gentle flag for you
            </p>
            <p className="muted mt-1.5 text-[13px] leading-relaxed">
              {escalated} This stays private — between you and your support circle, never your classmates. Talking it through right now genuinely helps.
            </p>
            <Link href="/mitra" className="btn btn-primary btn-sm mt-3">Talk to Lily Ai</Link>
          </div>
        )}
      </section>

      <section className="card p-5">
        <SectionHeading title="Your last two weeks" hint="A quiet record of how you've been." />
        <div className="mt-4 grid grid-cols-7 gap-2">
          {data.series.map((d) => (
            <div
              key={d.date}
              title={`${d.date}${d.note ? ` — ${d.note}` : ""}`}
              className={`grid aspect-square place-items-center rounded-xl border bg-[var(--ink-2)] text-[18px] ${d.flagged ? "border-[rgba(224,139,139,0.5)]" : "border-[var(--line)]"}`}
            >
              {d.emoji ?? <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-3)] opacity-50" />}
            </div>
          ))}
        </div>
        <p className="faint mt-3 text-[12px]">{data.total} check-ins logged so far. Only you and your counsellor ever see these.</p>
      </section>
    </div>
  );
}
