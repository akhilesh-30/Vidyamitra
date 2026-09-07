"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, RequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { StudentShell } from "@/components/student-shell";
import { LinkButton } from "@/components/controls";
import { BreakOverlay } from "@/components/student/break-overlay";
import type { AdaptivePlan, StressLevel, StudentRow, TopicWithContent } from "@/lib/types";

/* --------------------------------------------------------------------
   Dashboard — the student's first stop.

   Shows today's practice plan (F6: quota sized by real stress state),
   the syllabus with real content links (F2), and — when the latest
   stress log is high — the one orchestrated break moment (F6). The
   break takes over the whole screen with breathing-paced motion; it is
   not a modal with a bounce.
   -------------------------------------------------------------------- */

interface SubjectSyllabus {
  subject: { id: string; name: string; board: string; class_level: number };
  topics: TopicWithContent[];
}

interface DashboardData {
  student: StudentRow;
  syllabus: SubjectSyllabus[];
  plan: AdaptivePlan & { pendingSyllabus: number };
  latestStress: { stress_score: StressLevel; logged_at: string; signals: Record<string, { detected: boolean; reason: string; detail?: string }> } | null;
}

/** A calm one-line phrase for the current stress state. */
function stressLine(score: StressLevel | null): { text: string; tone: "calm" | "watch" | "care" } {
  if (score === "high")
    return { text: "Today looks heavy. The plan got smaller so it fits — and a pause is ready when you want it.", tone: "care" };
  if (score === "medium")
    return { text: "Today feels a bit heavier than usual, so the plan was trimmed a little.", tone: "watch" };
  return { text: "Nothing worrying in your recent work — the plan below fits a steady day.", tone: "calm" };
}

export function DashboardView() {
  const { state, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await apiFetch<DashboardData>("/api/dashboard");
      setData(d);
      // The break offers itself when the latest log is high. One gentle
      // entry per load, never forced mid-question.
      if (d.latestStress?.stress_score === "high") {
        setBreakOpen(true);
      }
    } catch (e) {
      if (e instanceof RequestError && (e.code === "UNAUTHENTICATED" || e.code === "NO_PROFILE")) throw e;
      setLoadError("Couldn't load your page just now. Check your internet and try again.");
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
        <Link href="/login" className="underline underline-offset-2 text-pine">Go to sign-in</Link>
      </div>
    );
  }
  if (state.status === "no-profile") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink">Almost there — we just need to know your class and board before you start.</p>
        <Link href="/onboarding" className="underline underline-offset-2 text-pine">Finish setting up</Link>
      </div>
    );
  }

  const student = state.student;
  if (!data) {
    return (
      <StudentShell student={student}>
        <div className="py-16 text-center text-steel">{loadError ?? "Loading your plan…"}</div>
      </StudentShell>
    );
  }

  const line = stressLine(data.latestStress?.stress_score ?? null);
  const allTopics = data.syllabus.flatMap((s) => s.topics);

  return (
    <StudentShell student={student}>
      {/* The one place motion budget is spent (F6). Covers everything. */}
      {breakOpen && data.latestStress?.stress_score === "high" ? (
        <BreakOverlay onClose={() => setBreakOpen(false)} quota={data.plan.quota} skipped={data.plan.skipped} />
      ) : null}

      {/* stress line */}
      <section
        className={`note-card mb-8 px-5 py-4 ${
          line.tone === "care" ? "border-ochre/50 bg-ochre/5" : line.tone === "watch" ? "border-ochre/30" : ""
        }`}
      >
        <p className="text-[1.02rem] text-ink">{line.text}</p>
        {data.latestStress?.stress_score === "high" ? (
          <button
            type="button"
            onClick={() => setBreakOpen(true)}
            className="mt-2 text-[0.95rem] font-semibold text-ochre underline underline-offset-2"
          >
            Take the pause now
          </button>
          ) : null}
      </section>

      {/* today's plan */}
      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[1.35rem] font-semibold text-ink">Today</h2>
          <span className="text-sm text-steel">
            {data.plan.quota} questions today
          </span>
        </div>
        <div className="note-card px-5 py-5">
          <p className="mb-4 text-[0.98rem] text-steel">{data.plan.quotaReason}</p>
          <ol className="space-y-2.5">
            {data.plan.queue.slice(0, 5).map((q, i) => (
              <li key={q.topic_id} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-sm tabular-nums text-steel">{i + 1}.</span>
                <span className="flex-1 text-[0.98rem] text-ink">{q.name}</span>
                <span className="text-sm text-steel">
                  {q.kind === "weak" ? "needs work" : q.kind === "new" ? "new chapter" : "come back to this"}
                </span>
              </li>
            ))}
          </ol>
          {data.plan.queue.length > 5 ? (
            <p className="mt-3 text-sm text-steel">…and {data.plan.queue.length - 5} more after that.</p>
          ) : null}
          {data.plan.skipped.length > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-sm text-steel">Left for a clearer day:</p>
              <ul className="mt-1 space-y-0.5">
                {data.plan.skipped.map((s) => (
                  <li key={s.topic_id} className="text-[0.95rem] text-steel">
                    {s.name} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-5">
            <LinkButton href="/practice">Start practice</LinkButton>
          </div>
        </div>
      </section>

      {/* chapters */}
      {data.syllabus.map((s) => (
        <section key={s.subject.id} className="mb-10">
          <h2 className="mb-3 font-display text-[1.35rem] font-semibold text-ink">{s.subject.name}</h2>
          <ol className="space-y-2">
            {s.topics.map((t, i) => (
              <li key={t.topic.id} className="note-card px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.98rem] text-ink">
                    <span className="mr-2 text-sm tabular-nums text-steel">{i + 1}.</span>
                    {t.topic.name}
                  </span>
                  <span className="shrink-0 text-sm text-steel">
                    {t.mastery === null
                      ? "not started"
                      : t.mastery >= 0.85
                        ? "mastered"
                        : t.mastery >= 0.7
                          ? "nearly there"
                          : t.mastery >= 0.4
                            ? "getting steadier"
                            : "just beginning"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[0.92rem]">
                  {t.contentLinks.map((l) =>
                    l.type === "pdf" ? (
                      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2">
                        textbook chapter (PDF)
                      </a>
                    ) : (
                      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2">
                        watch: {l.title ?? "video lesson"}
                      </a>
                    )
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {/* check-in reminder card */}
      <section className="note-card mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-[0.98rem] text-ink">
          Finished practising? Say how the session felt — it helps the plan fit you better tomorrow.
        </p>
        <LinkButton href="/checkin" variant="ghost">How I feel</LinkButton>
      </section>
    </StudentShell>
  );
}

