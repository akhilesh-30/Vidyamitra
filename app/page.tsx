"use client";

/* Vidyamitra landing — calm night sky, a thinking brain of light, and a
   single honest promise: learn steadily, feel cared for. */

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, HeartPulse, Sparkles, CirclePlay, ShieldCheck, Gamepad2, Users, LineChart, MoonStar } from "lucide-react";
import BrainOrb from "@/components/brain-orb";

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

export default function LandingPage() {
  const [paused, setPaused] = useState(false);

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503] glow">
            <Brain size={19} strokeWidth={2.4} />
          </span>
          <span className="display text-lg font-semibold tracking-wide">Vidyamitra</span>
        </Link>
        <nav className="flex items-center gap-2.5">
          <Link href="/counsellor" className="btn btn-ghost btn-sm hidden sm:inline-flex">For counsellors</Link>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Start learning</Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-2 lg:pt-2">
        <div className="fade-up">
          <span className="eyebrow"><span className="eyebrow-dot" /> Learn · Feel · Grow</span>
          <h1 className="hero-title mt-5">
            Study with a<br />
            <span className="text-gradient-ember">calmer mind.</span>
          </h1>
          <p className="muted mt-6 max-w-xl text-[16.5px] leading-relaxed">
            Vidyamitra is a <strong className="text-[var(--text-1)]">Maths &amp; Science companion for Classes 5–10</strong> (CBSE &amp; Maharashtra board) that
            watches your learning <em>and</em> your mood — pacing revision, celebrating progress, and calling a counsellor when the weight gets heavy.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/signup" className="btn btn-primary text-[15px]">
              Start learning <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-ghost text-[15px]">I already have an account</Link>
          </div>
          <div className="faint mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <span>Classes 5 – 10</span>
            <span className="hidden h-3.5 w-px bg-[var(--line-strong)] sm:block" />
            <span>CBSE · Maharashtra</span>
            <span className="hidden h-3.5 w-px bg-[var(--line-strong)] sm:block" />
            <span>AI doubts · Mood-aware</span>
          </div>
        </div>

        <div
          className="fade-up fade-up-2 relative mx-auto aspect-square w-full max-w-[520px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(240,178,90,0.14),transparent_65%)]" />
          <BrainOrb />
          <div className="pointer-events-none absolute inset-x-8 bottom-3 text-center">
            <span className="chip chip-ember">interactive — it follows your cursor</span>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-9 text-center"
        >
          <h2 className="text-3xl sm:text-4xl">More than marks.<br className="sm:hidden" /> A steadier you.</h2>
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
      <section className="mx-auto max-w-6xl px-5 py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="card relative overflow-hidden p-7 sm:p-10"
        >
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(143,185,150,0.16),transparent_70%)]" />
          <span className="eyebrow"><Sparkles size={13} /> How a day flows</span>
          <div className="mt-7 grid gap-7 sm:grid-cols-3">
            {[
              { n: "01", t: "Check in", d: "One emoji and an honest line. The day's plan adapts to it — heavy mornings get lighter quests." },
              { n: "02", t: "Learn & prove it", d: "Watch a topic video, take the AI quiz, watch the mastery bar climb. Chapter exercise locks it in." },
              { n: "03", t: "Unwind", d: "Play a mind game, chat with Mitra, or close the app knowing tomorrow is already planned." },
            ].map((s) => (
              <div key={s.n} className="relative">
                <span className="display ember text-3xl font-semibold">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="muted mt-1.5 text-[13.5px] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-9">
            <Link href="/signup" className="btn btn-primary">Begin today <ArrowRight size={16} /></Link>
          </div>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-[var(--line)] px-5 py-8 sm:flex-row">
        <span className="faint text-[13px]">© 2026 Vidyamitra — built to lighten school, not add to it.</span>
        <span className="faint flex items-center gap-2 text-[13px]">
          <CirclePlay size={15} /> Every topic links a lesson · <span className="sage">In crisis? Tele-MANAS 14416</span>
        </span>
      </footer>
    </main>
  );
}
