"use client";

/* Today — the daily hub. Mood first, then a plan that already accounts for it. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, HeartPulse, Lightbulb, Sparkles, TrendingDown, TrendingUp, Wind,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Bar, Done, Empty, ErrorNote, SectionHeading, Spinner, Stat } from "@/components/ui";
import MoodCard from "@/components/mood-card";
import { MOOD_FACES } from "@/lib/moods";
import type { StressLevel } from "@/lib/types";

interface TodayTask {
  id: string;
  kind: "study" | "wellness" | "fun";
  title: string;
  detail: string;
  minutes: number;
}

interface TodayPayload {
  today: string;
  todayMood: { emoji: string | null; note: string | null } | null;
  streak: number;
  attempts7d: number;
  accuracy: number | null;
  masteredCount: number;
  totalTopics: number;
  overall: number;
  weak: { id: string; name: string; chapter: string; subject: string; mastery: number | null }[];
  next: { id: string; name: string; chapter: string; subject: string }[];
  stress: { score: StressLevel; at: string } | null;
  tasks: TodayTask[];
}

const KIND_META: Record<TodayTask["kind"], { label: string; tone: string; href: string }> = {
  study: { label: "Study", tone: "var(--ember)", href: "/learn" },
  wellness: { label: "Wellbeing", tone: "var(--sage)", href: "/games" },
  fun: { label: "Just for fun", tone: "var(--violet)", href: "/games" },
};

export default function DashboardPage() {
  const { state } = useAuth();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<TodayPayload>("/api/today");
      setData(res);
      const key = `vm_tasks_${res.today}`;
      setDoneIds(JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[]);
      window.localStorage.setItem("vm_streak", String(res.streak));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load today's plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (state.status === "ready") void load();
  }, [state.status, load]);

  function toggleTask(id: string) {
    if (!data) return;
    const key = `vm_tasks_${data.today}`;
    const next = doneIds.includes(id) ? doneIds.filter((x) => x !== id) : [...doneIds, id];
    setDoneIds(next);
    window.localStorage.setItem(key, JSON.stringify(next));
  }

  if (loading) return <Spinner label="Gathering today…" />;
  if (error) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!data) return null;

  const firstName = (state.status === "ready" ? state.student.name ?? "friend" : "friend").split(" ")[0];
  const tasksDone = data.tasks.filter((t) => doneIds.includes(t.id)).length;
  const taskPct = data.tasks.length ? tasksDone / data.tasks.length : 0;

  return (
    <div className="space-y-7">
      {/* greeting */}
      <div className="fade-up">
        <span className="eyebrow"><span className="eyebrow-dot" /> {prettyDate(data.today)}</span>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight sm:text-[32px]">
          {greeting()}, {firstName}.
        </h1>
        <p className="muted mt-2 max-w-xl text-[14.5px] leading-relaxed">
          {data.todayMood
            ? "You already checked in today — your plan below is shaped around how you feel."
            : "One quick check-in first, and today's plan reshapes itself around your mood."}
        </p>
      </div>

      {/* mood + streak row */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <MoodCard
          today={data.today}
          current={data.todayMood}
          onSaved={() => void load()}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Stat label="Streak" value={`${data.streak}d`} hint={data.streak > 0 ? "Keep it alive today" : "Check in to begin"} />
          <Stat
            label="Last 7 days"
            value={data.attempts7d}
            hint={data.accuracy === null ? "No questions yet" : `${Math.round(data.accuracy * 100)}% correct`}
            tone="sky"
          />
        </div>
      </div>

      {/* today's plan */}
      <section>
        <SectionHeading
          title="Today's plan"
          hint={
            data.tasks.length
              ? `${tasksDone} of ${data.tasks.length} done - about ${data.tasks.reduce((a, t) => a + t.minutes, 0)} minutes in total`
              : undefined
          }
          right={
            <span className="chip chip-ember">
              <Sparkles size={13} /> {Math.round(taskPct * 100)}%
            </span>
          }
        />
        <Bar value={taskPct} tone={taskPct >= 0.66 ? "sage" : "ember"} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.tasks.map((t) => {
            const meta = KIND_META[t.kind];
            const isDone = doneIds.includes(t.id);
            return (
              <article key={t.id} className="card card-hover p-4" style={isDone ? { opacity: 0.62 } : undefined}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 13%, transparent)` }}
                  >
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    aria-label={isDone ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`}
                    className="rounded-full p-0.5"
                  >
                    <Done done={isDone} />
                  </button>
                </div>
                <h3 className={`text-[15px] font-semibold leading-snug ${isDone ? "line-through" : ""}`}>{t.title}</h3>
                <p className="muted mt-1.5 text-[13px] leading-relaxed">{t.detail}</p>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className="faint text-[11.5px]">{t.minutes} min</span>
                  <Link href={meta.href} className="ember text-[12.5px] font-medium">
                    Open <ArrowRight size={13} className="inline -translate-y-px" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* progress snapshot */}
      <section className="card p-5 sm:p-6">
        <SectionHeading title="Where you stand" hint="Across every chapter in your syllabus." />
        <div className="mb-4 flex items-baseline gap-2.5">
          <span className="display text-[34px] font-semibold leading-none">{Math.round(data.overall * 100)}%</span>
          <span className="faint text-[13px]">overall mastery</span>
        </div>
        <Bar value={data.overall} tone={data.overall >= 0.7 ? "sage" : "ember"} />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[20px] font-semibold">{data.masteredCount}</p>
            <p className="faint text-[11.5px]">topics mastered</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[20px] font-semibold">{data.totalTopics}</p>
            <p className="faint text-[11.5px]">topics in your course</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[20px] font-semibold">{data.streak}</p>
            <p className="faint text-[11.5px]">day streak</p>
          </div>
        </div>
      </section>

      {/* attention + up next */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <SectionHeading
            title="Worth another look"
            hint={data.weak.length ? "Topics under 70% - small wins, big lift." : "Nothing shaky yet. Nice."}
            right={<TrendingDown size={17} className="text-[var(--rose)]" />}
          />
          {data.weak.length === 0 ? (
            <Empty
              icon={<Lightbulb size={20} />}
              title="No weak spots yet"
              text="Once you attempt a few quizzes, the topics that need work show up here."
              action={<Link href="/learn" className="btn btn-ghost btn-sm mt-3">Start learning</Link>}
            />
          ) : (
            <ul className="space-y-2.5">
              {data.weak.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{t.name}</p>
                    <p className="faint mt-0.5 text-[11.5px]">{t.subject} / {t.chapter}</p>
                    <div className="mt-2"><Bar value={t.mastery ?? 0} tone="rose" /></div>
                  </div>
                  <span className="display shrink-0 text-[15px] font-semibold text-[var(--rose)]">
                    {Math.round((t.mastery ?? 0) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <SectionHeading
            title="Up next"
            hint="Fresh ground, in syllabus order."
            right={<TrendingUp size={17} className="text-[var(--sage)]" />}
          />
          {data.next.length === 0 ? (
            <Empty
              icon={<BookOpen size={20} />}
              title="Course complete"
              text="You have touched every topic. Switch to Exam mode for revision."
            />
          ) : (
            <ul className="space-y-2.5">
              {data.next.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[rgba(240,178,90,0.1)] text-[var(--ember)]">
                    <BookOpen size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{t.name}</p>
                    <p className="faint mt-0.5 text-[11.5px]">{t.subject} / {t.chapter}</p>
                  </div>
                  <Link href="/learn" className="btn btn-ghost btn-sm shrink-0">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* support strip */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[rgba(143,185,150,0.12)] text-[var(--sage)]">
            {data.stress && data.stress.score !== "low" ? <Wind size={17} /> : <HeartPulse size={17} />}
          </span>
          <div>
            <p className="text-[14.5px] font-semibold">{supportTitle(data.stress?.score ?? null)}</p>
            <p className="muted mt-1 max-w-xl text-[13px] leading-relaxed">{supportText(data.stress?.score ?? null)}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Link href="/mitra" className="btn btn-ghost btn-sm">Talk to Mitra</Link>
          <Link href="/checkin" className="btn btn-primary btn-sm">Check in</Link>
        </div>
      </section>
    </div>
  );
}

function supportTitle(score: StressLevel | null): string {
  if (score === null) return "We're still learning your patterns";
  if (score === "low") return "Your recent signals look settled";
  if (score === "medium") return "Things look a little stretched lately";
  return "This has been a heavy stretch";
}

function supportText(score: StressLevel | null): string {
  if (score === null) {
    return "Keep practising and checking in. After a few days we can spot patterns and gently adjust how much you carry.";
  }
  if (score === "low") {
    return "Accuracy and timing both look healthy. Good moment to push a little - not a lot.";
  }
  return "If it feels like too much, say it out loud to someone you trust. Mitra is here any hour, and your counsellor can step in too.";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function prettyDate(key: string): string {
  const d = new Date(`${key}T06:00:00+05:30`);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}