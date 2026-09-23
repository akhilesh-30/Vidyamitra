"use client";

/* Progress — mastery totals, stress history and today's adaptive plan,
   all read from /api/progress. */

import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Bar, SectionHeading, Stat } from "@/components/ui";

interface ProgressTopic {
  topic: { id: string; name: string };
  mastery: number | null;
}
interface ProgressSubject {
  subject: { id: string; name: string };
  topics: ProgressTopic[];
}
interface ProgressData {
  syllabus: ProgressSubject[];
  stressHistory: { logged_at: string; stress_score: number; signals?: unknown }[];
  plan: {
    quota: number;
    quotaReason?: string | null;
    queue: { topic?: { name: string }; reason?: string | null }[];
    skipped?: unknown[];
  };
  totals: { total: number; attempted: number; mastered: number; remaining: number };
  recent: { attempts_24h: number; correct_24h: number };
}

const stressColor = (s: number) => (s <= 2 ? "var(--sage)" : s <= 3 ? "var(--ember)" : "var(--rose)");

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<ProgressData>("/api/progress"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your progress. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="card flex items-center gap-3 p-6 text-[14px]">
          <Loader2 size={17} className="animate-spin text-[var(--ember)]" />
          <span className="muted">Reading your progress…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="card p-6">
          <p className="text-[14px]" style={{ color: "var(--rose)" }}>{error}</p>
          <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => void load()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const acc = data.recent.attempts_24h
    ? Math.round((data.recent.correct_24h / data.recent.attempts_24h) * 100)
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <SectionHeading
        title="Progress"
        hint="Mastery, stress and today's plan — the full picture, honestly drawn."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="topics touched" value={`${data.totals.attempted}/${data.totals.total}`} />
        <Stat label="mastered" value={String(data.totals.mastered)} />
        <Stat label="remaining" value={String(data.totals.remaining)} />
        <Stat label="accuracy 24h" value={acc === null ? "—" : `${acc}%`} />
      </div>

      {/* today's adaptive plan */}
      <div className="card mt-6 p-5">
        <p className="text-[15.5px] font-semibold">Today's plan</p>
        <p className="muted mt-1 text-[13px]">
          {data.plan.quotaReason || `${data.plan.quota} questions today.`}
        </p>
        <div className="mt-4 space-y-2.5">
          {data.plan.queue.slice(0, 5).map((q, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3.5 py-2.5"
            >
              <span className="truncate text-[13.5px]">{q.topic?.name ?? "Practice"}</span>
              {q.reason ? <span className="faint shrink-0 text-[11.5px]">{q.reason}</span> : null}
            </div>
          ))}
          {!data.plan.queue.length && (
            <p className="faint text-[13px]">Nothing queued — take the rest, you've earned it.</p>
          )}
        </div>
      </div>

      {/* stress history — last 28 logs as calm bars */}
      <div className="card mt-6 p-5">
        <p className="text-[15.5px] font-semibold">Stress history</p>
        {data.stressHistory.length ? (
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {data.stressHistory.slice(-28).map((s, i) => (
              <div
                key={i}
                className="min-w-2 flex-1 rounded-t-[3px]"
                style={{
                  height: `${Math.max(8, (s.stress_score / 5) * 100)}%`,
                  background: stressColor(s.stress_score),
                  opacity: 0.72,
                }}
                title={`Stress ${s.stress_score}/5`}
              />
            ))}
          </div>
        ) : (
          <p className="faint mt-3 text-[13px]">
            No stress logs yet — they appear after your daily check-ins.
          </p>
        )}
      </div>

      {/* mastery by subject */}
      <div className="mt-6 space-y-4">
        {data.syllabus.map((subject) => {
          const started = subject.topics.filter((t) => t.mastery !== null);
          return (
            <div key={subject.subject.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15.5px] font-semibold">{subject.subject.name}</p>
                <span className="faint text-[12px]">{started.length}/{subject.topics.length} started</span>
              </div>
              {started.length ? (
                <ul className="mt-4 space-y-3.5">
                  {started
                    .slice()
                    .sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0))
                    .slice(0, 10)
                    .map((t) => {
                      const m = t.mastery ?? 0;
                      return (
                        <li key={t.topic.id}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[13.5px]">{t.topic.name}</span>
                            <span className="faint text-[12px]">{Math.round(m * 100)}%</span>
                          </div>
                          <div className="mt-1.5">
                            <Bar
                              value={m}
                              tone={m >= 0.85 ? "sage" : m >= 0.5 ? "ember" : "rose"}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="faint mt-3 text-[13px]">
                  Not started yet — open Learn and practise your first topic.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
