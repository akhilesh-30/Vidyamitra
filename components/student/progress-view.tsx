"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, RequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { StudentShell } from "@/components/student-shell";
import type { StressLevel, TopicWithContent } from "@/lib/types";

/* --------------------------------------------------------------------
   Progress (F9) — a calm garden, not a leaderboard.

   The heatmap reads as growth of green, deepest pine for mastery;
   nothing flashes, nothing counts up. The wellness trend is a quiet
   row of days, each carrying the real "why" from the stress model.
   -------------------------------------------------------------------- */

interface ProgressData {
  syllabus: { subject: { id: string; name: string }; topics: TopicWithContent[] }[];
  stressHistory: { logged_at: string; stress_score: StressLevel; signals: Record<string, { detected: boolean; reason: string; detail?: string }> | null }[];
  plan: {
    quota: number;
    quotaReason: string;
    queue: { topic_id: string; name: string; kind: string }[];
    skipped: { topic_id: string; name: string; reason: string }[];
  };
  totals: { total: number; attempted: number; mastered: number; remaining: number };
  pendingSyllabus: number;
  recent: { attempts_24h: number; correct_24h: number };
}

/* ---------- garden heatmap ---------- */

function gardenColor(mastery: number | null): { bg: string; fg: string } {
  if (mastery === null) return { bg: "bg-card", fg: "text-steel/60" };
  if (mastery >= 0.85) return { bg: "bg-grow-4", fg: "text-[#f4f8f4]" };
  if (mastery >= 0.7) return { bg: "bg-grow-3", fg: "text-[#12241b]" };
  if (mastery >= 0.4) return { bg: "bg-grow-2", fg: "text-[#12241b]" };
  return { bg: "bg-grow-1", fg: "text-[#12241b]" };
}

function bandWord(mastery: number | null): string {
  if (mastery === null) return "not started";
  if (mastery >= 0.85) return "mastered";
  if (mastery >= 0.7) return "nearly there";
  if (mastery >= 0.4) return "getting steadier";
  return "just beginning";
}

function GardenCell({ topic, mastery }: { topic: string; mastery: number | null }) {
  const { bg, fg } = gardenColor(mastery);
  return (
    <div
      title={`${topic} — ${bandWord(mastery)}`}
      className={`flex h-12 flex-col items-center justify-center rounded-[4px] border border-line/60 px-1 ${bg} ${fg}`}
    >
      <span className="w-full truncate text-center text-[0.72rem] font-medium leading-tight">{topic}</span>
      <span className="text-[0.62rem] opacity-80">{mastery === null ? "—" : `${Math.round(mastery * 100)}%`}</span>
    </div>
  );
}

/* ---------- wellness trend ---------- */

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function wellnessTone(score: StressLevel): string {
  if (score === "high") return "bg-ochre";
  if (score === "medium") return "bg-ochre/45";
  return "bg-grow-2";
}

/* ---------- the view ---------- */

export function ProgressView() {
  const { state } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await apiFetch<ProgressData>("/api/progress"));
    } catch (e) {
      if (e instanceof RequestError && (e.code === "UNAUTHENTICATED" || e.code === "NO_PROFILE")) throw e;
      setLoadError("Couldn't load your progress just now. Check your internet and try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
  if (!data) {
    return (
      <StudentShell student={student}>
        <div className="py-16 text-center text-steel">{loadError ?? "Loading your progress…"}</div>
      </StudentShell>
    );
  }

  // One wellness square per day that has a log; latest day last.
  const byDay = new Map<string, StressLevel>();
  for (const l of data.stressHistory) byDay.set(dayKey(l.logged_at), l.stress_score);
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <StudentShell student={student}>
      <h1 className="mb-1 font-display text-[2rem] font-semibold text-ink">How it's growing</h1>
      <p className="mb-8 text-[0.98rem] text-steel">
        {data.recent.attempts_24h > 0
          ? `Last day: ${data.recent.attempts_24h} questions, ${data.recent.correct_24h} right. Slow and steady is exactly how this works.`
          : "Nothing practised in the last day — the garden keeps all the same; it grows when you water it."}
      </p>

      {/* garden heatmap, one bed per subject */}
      {data.syllabus.map((s) => (
        <section key={s.subject.id} className="mb-10">
          <h2 className="mb-3 font-display text-[1.35rem] font-semibold text-ink">{s.subject.name}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {s.topics.map((t) => (
              <GardenCell key={t.topic.id} topic={t.topic.name} mastery={t.mastery} />
            ))}
          </div>
          <p className="mt-2 text-sm text-steel">
            {(() => {
              const attempted = s.topics.filter((t) => t.mastery !== null).length;
              const mastered = s.topics.filter((t) => (t.mastery ?? 0) >= 0.85).length;
              return `${s.topics.length} chapters · ${attempted} started · ${mastered} mastered`;
            })()}
          </p>
        </section>
      ))}

      {/* wellness trend */}
      <section className="mb-10">
        <h2 className="mb-1 font-display text-[1.35rem] font-semibold text-ink">How the days have felt</h2>
        <p className="mb-3 text-[0.95rem] text-steel">
          Each square is a day the app noticed something about your practice. It never judges — it just paces you.
        </p>
        {days.length === 0 ? (
          <p className="note-card px-5 py-4 text-[0.95rem] text-steel">
            Nothing logged yet. After your next session this will show how the days have been going.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {days.map(([d, score]) => {
              const logsThatDay = data.stressHistory.filter((l) => dayKey(l.logged_at) === d);
              const reasons = logsThatDay
                .flatMap((l) => Object.values(l.signals ?? {}))
                .filter((sig) => sig?.detected)
                .map((sig) => sig.reason);
              const label = new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              return (
                <li key={d} className="note-card flex items-start gap-3 px-4 py-3">
                  <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${wellnessTone(score)}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[0.95rem] text-ink">
                      <span className="font-semibold">{label}</span>
                      <span className="text-steel"> — {score === "high" ? "a heavy day" : score === "medium" ? "a bit heavy" : "steady"}</span>
                    </p>
                    {reasons.length > 0 ? (
                      <p className="mt-0.5 text-sm text-steel">{reasons[0]}</p>
                    ) : (
                      <p className="mt-0.5 text-sm text-steel">No warning signs in your work — nothing to change.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* upcoming load */}
      <section className="mb-6">
        <h2 className="mb-1 font-display text-[1.35rem] font-semibold text-ink">What's ahead</h2>
        <p className="mb-3 text-[0.95rem] text-steel">
          {data.pendingSyllabus} of {data.totals.total} chapters still need real practice before the plan lightens.
          {data.plan.skipped.length > 0 ? " A couple were deliberately left for a clearer day — that's on purpose." : ""}
        </p>
        <div className="note-card px-5 py-5">
          <p className="text-[1.02rem] text-ink">
            Tomorrow's plan starts with{" "}
            <span className="font-semibold">{data.plan.queue[0]?.name ?? "a short review"}</span>
            {data.plan.queue.length > 1 ? (
              <>
                {" "}and then{" "}
                <span className="font-semibold">{data.plan.queue[1]?.name}</span>
              </>
            ) : null}.
          </p>
          <p className="mt-1 text-sm text-steel">{data.plan.quotaReason}</p>
          {data.plan.skipped.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-line pt-3">
              {data.plan.skipped.map((s) => (
                <li key={s.topic_id} className="text-[0.95rem] text-steel">
                  {s.name} — {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </StudentShell>
  );
}
