"use client";

/* Badges — proof of showing up. Earned from your own numbers, never a
   leaderboard: the only person you're competing with is yesterday's you. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Gamepad2, HeartPulse, LineChart, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { ErrorNote, SectionHeading, Spinner } from "@/components/ui";

interface Today {
  streak: number;
  attempts7d: number;
  accuracy: number | null;
  masteredCount: number;
  totalTopics: number;
}

export default function BadgesPage() {
  const [data, setData] = useState<Today | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiFetch<Today>("/api/today"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your badges.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (error && !data) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!data) return <Spinner label="Polishing your shelf…" />;

  const { streak, attempts7d, accuracy, masteredCount, totalTopics } = data;
  const quarterGoal = Math.max(1, Math.ceil(totalTopics * 0.25));

  const badges: { id: string; icon: typeof Sparkles; title: string; text: string; earned: boolean; hint?: string }[] = [
    { id: "first", icon: Sparkles, title: "First steps", text: "Answer your first question.", earned: attempts7d >= 1, hint: attempts7d >= 1 ? undefined : "0/1" },
    { id: "rhythm3", icon: HeartPulse, title: "3-day rhythm", text: "Show up three days in a row.", earned: streak >= 3, hint: `${Math.min(streak, 3)}/3 days` },
    { id: "calm7", icon: Wind, title: "A week of calm", text: "Seven-day streak — steadiness is a skill.", earned: streak >= 7, hint: `${Math.min(streak, 7)}/7 days` },
    { id: "sharp", icon: LineChart, title: "Sharp shooter", text: "80%+ accuracy across 20 questions.", earned: accuracy !== null && attempts7d >= 20 && accuracy >= 0.8 },
    { id: "century", icon: Gamepad2, title: "Century", text: "100 questions in a single week.", earned: attempts7d >= 100, hint: `${Math.min(attempts7d, 100)}/100` },
    { id: "scholar", icon: BookOpen, title: "Scholar", text: "Master five topics.", earned: masteredCount >= 5, hint: `${Math.min(masteredCount, 5)}/5` },
    { id: "quarter", icon: ShieldCheck, title: "Quarter way", text: "Master a quarter of your syllabus.", earned: totalTopics > 0 && masteredCount >= quarterGoal, hint: `${Math.min(masteredCount, quarterGoal)}/${quarterGoal}` },
  ];

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <span className="eyebrow"><span className="eyebrow-dot" /> Badges</span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Your shelf of showing up</h1>
        <p className="muted mt-2 max-w-xl text-[14px]">{earnedCount} of {badges.length} earned. These come from your own effort — there is no leaderboard, only your last-best-self to beat.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.id} className={`card flex items-start gap-3 p-4 ${b.earned ? "border-[rgba(143,185,150,0.45)]" : "opacity-70"}`}>
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                style={{ background: b.earned ? "rgba(143,185,150,0.14)" : "rgba(240,216,180,0.05)", color: b.earned ? "var(--sage)" : "var(--text-3)" }}
              >
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                  {b.title}
                  {b.earned && <span className="text-[var(--sage)]">✓</span>}
                </p>
                <p className="muted mt-0.5 text-[12.5px] leading-snug">{b.text}</p>
                {!b.earned && b.hint && <p className="faint mt-1 text-[11.5px]">{b.hint}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <section className="card p-5">
        <SectionHeading title="Keep the streak alive" hint="Small, steady sessions beat midnight marathons." />
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link href="/learn" className="btn btn-ghost btn-sm">Practise now</Link>
          <Link href="/checkin" className="btn btn-primary btn-sm">Check in today</Link>
        </div>
      </section>
    </div>
  );
}
