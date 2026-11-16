"use client";

/* Vidyamitra landing — a night valley of glowing flowers, one cream promise,
   and below it the honest explanation of what the app does. The hero follows
   the Fernhollow layout exactly (condensed headline, cream pill, round arrow,
   scroll cue, sound toggle); its copy and links are Vidyamitra's. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  HeartPulse,
  Sparkles,
  CirclePlay,
  ShieldCheck,
  Gamepad2,
  Users,
  LineChart,
  MoonStar,
} from "lucide-react";
import FlowerValley from "@/components/flower-valley";

const FEATURES = [
  {
    icon: LineChart,
    color: "var(--ember)",
    title: "Know exactly where you stand",
    text: "Every topic carries a live mastery bar. AI-generated questions after each lesson turn revision into proof, not guesswork.",
  },
  {
    icon: HeartPulse,
    color: "var(--sage)",
    title: "A daily mood check-in that actually helps",
    text: "One tap logs how you feel. Vidyamitra reads the pattern and quietly reshapes your day — lighter load on heavy days.",
  },
  {
    icon: MoonStar,
    color: "var(--sky)",
    title: "Exam mode for the night before",
    text: "Crisp revision points, every formula in one sheet, and a timed mock — made for your exact chapter, in minutes.",
  },
  {
    icon: Users,
    color: "var(--violet)",
    title: "Unburden, anonymously",
    text: "A safe space to pour out what you can't say out loud. Same mask every time, zero judgement, gentle replies.",
  },
  {
    icon: ShieldCheck,
    color: "var(--rose)",
    title: "A counsellor in the loop",
    text: "When academics and mood both dip, your school counsellor is softly notified. Not an alarm — a nudge with context.",
  },
  {
    icon: Gamepad2,
    color: "var(--ember-deep)",
    title: "Mind games, not mindless scrolling",
    text: "Breathing coach, memory match, worry-pop — five playful minutes that return a calmer, sharper brain.",
  },
];

/* A quiet ambient pad, generated in the browser: no audio file to load, and it
   starts silent until the speaker button is pressed. */
function useAmbient(hover: boolean) {
  const audio = useRef<{ ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const [on, setOn] = useState(false);

  const toggle = useCallback(() => {
    if (!audio.current) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1900;
      filter.Q.value = 0.4;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      filter.connect(gain);
      gain.connect(ctx.destination);

      [110, 164.81, 220, 277.18].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        osc.detune.value = (i - 1.5) * 7;
        const voice = ctx.createGain();
        voice.gain.value = 0.3 / (i + 1.4);
        osc.connect(voice);
        voice.connect(filter);
        osc.start();
      });

      audio.current = { ctx, gain, filter };
    }

    const { ctx, gain } = audio.current;
    void ctx.resume();
    const next = !on;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(next ? 0.045 : 0, ctx.currentTime + 1.1);
    setOn(next);
  }, [on]);

  // the arrow's hover transition also muffles the pad
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.filter.frequency.setTargetAtTime(hover ? 340 : 1900, a.ctx.currentTime, 0.25);
  }, [hover]);

  useEffect(() => {
    return () => {
      const a = audio.current;
      if (a) void a.ctx.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  return { on, toggle };
}

export default function LandingPage() {
  const [hover, setHover] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { on: soundOn, toggle: toggleSound } = useAmbient(hover);

  useEffect(() => {
    if (!ready) return;
    const hide = window.setTimeout(() => setLoaderGone(true), 1100);
    return () => window.clearTimeout(hide);
  }, [ready]);

  return (
    <main>
      {/* ---------- hero ---------- */}
      <section className="fh">
        <div className="fh-sky" aria-hidden="true" />
        <FlowerValley hover={hover} onReady={() => setReady(true)} onIntro={() => setRevealed(true)} />
        <div className="fh-vignette" aria-hidden="true" />

        <div className={`fh-ui ${revealed ? "on" : ""}`}>
          <header className="fh-head">
            <Link className="fh-logo" href="/" aria-label="Vidyamitra">
              Vidyamitra
            </Link>
            <nav className="fh-nav" aria-label="Main">
              <a href="#features">Learn</a>
              <a href="#flow">Feel</a>
              <a href="/counsellor">For counsellors</a>
              <Link className="fh-pill" href="/signup">
                Start learning
              </Link>
            </nav>
          </header>

          <div className="fh-hero">
            <h1 className="fh-h1">Learn with a calmer mind.</h1>
            <p className="fh-cap">
              Academics and mental wellness, together.
              <br />
              Paced to how you actually feel.
            </p>
            <Link
              className="fh-go"
              href="/signup"
              aria-label="Start learning"
              onPointerEnter={() => setHover(true)}
              onPointerLeave={() => setHover(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="fh-corner">
            <span>Scroll to explore</span>
            <i aria-hidden="true" />
            <button
              type="button"
              className="fh-sound"
              aria-pressed={soundOn}
              aria-label="Ambient sound"
              onClick={toggleSound}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
                <path className="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                <path className="x" d="m16 10 4 4m0-4-4 4" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`fh-loader ${ready ? "gone" : ""}`} hidden={loaderGone} aria-hidden="true">
          <span />
        </div>
      </section>

      {/* ---------- below the valley ---------- */}
      <div className="relative z-10 bg-[var(--ink-0)]">
        <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-8 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mb-9 text-center"
          >
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Learn · Feel · Grow
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl">
              More than marks.
              <br className="sm:hidden" /> A steadier you.
            </h2>
            <p className="muted mx-auto mt-3 max-w-xl text-[15px]">
              Six quiet systems working together, so school feels lighter.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="card card-hover p-5"
              >
                <span
                  className="mb-4 grid h-10 w-10 place-items-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${f.color} 32%, transparent)`,
                    color: f.color,
                  }}
                >
                  <f.icon size={19} />
                </span>
                <h3 className="text-[16.5px] font-semibold">{f.title}</h3>
                <p className="muted mt-2 text-[13.5px] leading-relaxed">{f.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* how it flows */}
        <section id="flow" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-14 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="card relative overflow-hidden p-7 sm:p-10"
          >
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(143,185,150,0.16),transparent_70%)]" />
            <span className="eyebrow">
              <Sparkles size={13} /> How a day flows
            </span>
            <div className="mt-7 grid gap-7 sm:grid-cols-3">
              {[
                { n: "01", t: "Check in", d: "One emoji and an honest line. The day's plan adapts to it — heavy mornings get lighter quests." },
                { n: "02", t: "Learn & prove it", d: "Watch a topic video, take the AI quiz, watch the mastery bar climb. Chapter exercise locks it in." },
                { n: "03", t: "Unwind", d: "Play a mind game, chat with Lily Ai, or close the app knowing tomorrow is already planned." },
              ].map((s) => (
                <div key={s.n} className="relative">
                  <span className="display ember text-3xl font-semibold">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                  <p className="muted mt-1.5 text-[13.5px] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary">
                Begin today <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-ghost">
                I already have an account
              </Link>
            </div>
          </motion.div>
        </section>

        <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-[var(--line)] px-5 py-8 sm:flex-row">
          <span className="faint text-[13px]">© 2026 Vidyamitra — built to lighten school, not add to it.</span>
          <span className="faint flex items-center gap-2 text-[13px]">
            <CirclePlay size={15} /> Every topic links a lesson · <span className="sage">In crisis? Tele-MANAS 14416</span>
          </span>
        </footer>
      </div>
    </main>
  );
}
