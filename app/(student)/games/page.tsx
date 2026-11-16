"use client";

/* Mind gym — tiny reset rituals. Pure client-side: no data, no scores. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, RotateCcw, Sparkles, Wind } from "lucide-react";
import { SectionHeading } from "@/components/ui";

const PHASES = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Breathe out", seconds: 6 },
] as const;

function Breathe() {
  const [running, setRunning] = useState(false);
  // One pure tick: count down, then advance the phase (4 in · 4 hold · 6 out).
  const [timer, setTimer] = useState({ phase: 0, left: PHASES[0].seconds as number, cycles: 0 });
  const { phase, cycles } = timer;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setTimer((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 };
        const next = (s.phase + 1) % PHASES.length;
        return {
          phase: next,
          left: PHASES[next].seconds,
          cycles: next === 0 ? s.cycles + 1 : s.cycles,
        };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const scale = running ? (PHASES[phase].label === "Breathe in" ? 1.25 : PHASES[phase].label === "Hold" ? 1.25 : 0.8) : 1;

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className="grid h-36 w-36 place-items-center rounded-full transition-transform ease-in-out"
        style={{
          transform: `scale(${scale})`,
          transitionDuration: `${PHASES[phase].seconds}s`,
          background: "radial-gradient(circle at 35% 30%, rgba(143,185,150,0.35), rgba(143,185,150,0.08) 70%)",
          border: "1px solid rgba(143,185,150,0.25)",
        }}
      >
        <span className="text-[14px] font-medium text-[var(--sage)]">
          {running ? PHASES[phase].label : "Ready"}
        </span>
      </div>
      <p className="faint mt-4 text-[12px]">{cycles > 0 ? `${cycles} full breath${cycles === 1 ? "" : "s"}` : "4 in · 4 hold · 6 out"}</p>
      <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => setRunning((r) => !r)}>
        <Wind size={15} /> {running ? "Pause" : "Start breathing"}
      </button>
      {cycles >= 3 && (
        <p className="muted mt-3 max-w-xs text-center text-[12.5px] leading-relaxed">
          Nicely done. Notice your shoulders — they already know.
        </p>
      )}
    </div>
  );
}

function Gratitude() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const dayKey = new Date().toISOString().slice(0, 10);
  const storeKey = `vm_gratitude_${dayKey}`;
  const loaded = useRef(false);

  useEffect(() => {
    try {
      setSaved(JSON.parse(window.localStorage.getItem(storeKey) ?? "[]") as string[]);
    } catch {
      setSaved([]);
    }
    loaded.current = true;
  }, [storeKey]);

  const save = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    const next = [...saved, t.slice(0, 200)].slice(-5);
    setSaved(next);
    window.localStorage.setItem(storeKey, JSON.stringify(next));
    setText("");
  }, [saved, storeKey, text]);

  return (
    <div className="py-1">
      <p className="muted text-[13px] leading-relaxed">
        Three small good things, once a day, retrains attention. Stored only on this device.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Today I'm glad for…"
          className="input flex-1"
          maxLength={200}
        />
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={save}>
          <Heart size={15} /> Save
        </button>
      </div>
      {saved.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {saved.map((s, i) => (
            <li key={i} className="muted text-[13px]">· {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GamesPage() {
  return (
    <div className="space-y-7">
      <div className="fade-up">
        <span className="eyebrow"><span className="eyebrow-dot" /> Mind gym</span>
        <h1 className="mt-3 text-3xl font-semibold">Small resets, anytime</h1>
        <p className="muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          No streaks here, no scores. Two quiet tools for when studying gets loud.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <SectionHeading
            title="Box breathing"
            hint="60 seconds to a slower heart rate"
            right={<Wind size={17} className="text-[var(--sage)]" />}
          />
          <Breathe />
        </section>

        <section className="card p-5">
          <SectionHeading
            title="Three good things"
            hint="A nightly habit that quietly lifts mood"
            right={<Sparkles size={17} className="text-[var(--violet)]" />}
          />
          <Gratitude />
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-4"
            onClick={() => {
              window.localStorage.removeItem(`vm_gratitude_${new Date().toISOString().slice(0, 10)}`);
              window.location.reload();
            }}
          >
            <RotateCcw size={14} /> Clear today
          </button>
        </section>
      </div>
    </div>
  );
}
