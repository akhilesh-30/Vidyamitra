"use client";

/* v0 breathing screen — the F6 break moment in the v0 visual language.
   Fed by REAL pacing data: the trimmed quota and the postponed topics
   come from the adaptive plan, exactly as the notebook version did. */

import { motion } from "framer-motion";
import { ArrowUpRight, Pause, Play, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function V0Breathing({
  quota,
  skipped,
  onReturn,
}: {
  quota: number;
  skipped: { topic_id: string; name: string; reason: string }[];
  onReturn: () => void;
}) {
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);

  // One full 4-7-8 cycle = 11s; the lighter plan reveals after the first.
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setCycles((c) => c + 1), 11_000);
    return () => window.clearInterval(t);
  }, [active]);

  return (
    <motion.main className="breathing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button className="close-break" onClick={onReturn} aria-label="Return to learning"><X /></button>
      <div className="breathing-copy">
        <span className="section-kicker">A QUIET MOMENT</span>
        <h2>Let&apos;s make a little<br /><em>room.</em></h2>
        <p>Before we continue, let&apos;s give your mind a moment to settle. Follow the circle at your own pace.</p>
      </div>
      <div className={`breath-orb ${active ? "is-active" : ""}`}>
        <div className="breath-ring" />
        <div className="breath-ring ring-two" />
        <div className="breath-core">
          <span>{active ? "Inhale" : "Ready?"}</span>
          <small>4 · 7 · 8</small>
        </div>
      </div>
      <div className="breathing-controls">
        <button className="button button-primary" onClick={() => setActive(!active)}>
          {active ? <><Pause /> Pause practice</> : <><Play /> Begin practice</>}
        </button>
        <button className="sound-button"><Volume2 /> Sound on</button>
      </div>
      <p className="breath-note">
        {cycles >= 1
          ? `Today is now just ${quota} questions — a light day.${skipped.length > 0 ? ` ${skipped.map((s) => s.name).join(" and ")} can wait for a clearer day.` : ""}`
          : "A three-minute reset can change the shape of the next hour."}
      </p>
      <button className="return-study" onClick={onReturn}>I feel ready to return <ArrowUpRight /></button>
    </motion.main>
  );
}
