"use client";

import { useEffect, useState } from "react";
import type { AdaptivePlan } from "@/lib/types";

/* --------------------------------------------------------------------
   The break moment (F6) — the one place the app spends motion budget.

   Not a modal, no bounce. When stress is high the screen itself slows:
   the page dims beneath a deep-paper wash, a soft light haze breathes
   in the background, and a single ring paces the breath — 4 seconds in,
   6 seconds out. The smaller plan is revealed only after the first
   breath completes, so the moment always leads with rest, not tasks.
   -------------------------------------------------------------------- */

const SKIPPED = "break-slow-in";

export function BreakOverlay({
  onClose,
  quota,
  skipped,
}: {
  onClose: () => void;
  quota: number;
  skipped: { topic_id: string; name: string; reason: string }[];
}) {
  // 0 = arriving (dim + slow-in), then alternate in/out with the ring.
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [cycles, setCycles] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // 4s in, then 6s out, repeating. Cycle count gates the plan reveal.
  useEffect(() => {
    if (leaving) return;
    const t = setTimeout(
      () => {
        if (phase === "in") {
          setPhase("out");
        } else {
          setPhase("in");
          setCycles((c) => c + 1);
        }
      },
      phase === "in" ? 4000 : 6000
    );
    return () => clearTimeout(t);
  }, [phase, leaving]);

  const close = () => {
    setLeaving(true);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="A short pause"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* deep-paper wash — the visible slowdown of the whole screen */}
      <div className="break-dim absolute inset-0 bg-[#22301f]/97" />

      {/* soft light haze, slowly shifting — barely there */}
      <div className="break-haze absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(227,236,229,0.10)_0%,transparent_60%)]" />

      <div className={`${SKIPPED} relative flex flex-col items-center px-6 text-center`}>
        <p className="font-display text-[1.5rem] font-medium text-[#eef1ee]">
          Let everything sit for a moment
        </p>
        <p className="mt-2 text-[0.98rem] text-[#b9c7bd]">
          Breathe with the ring. Nothing to answer right now.
        </p>

        {/* the breath ring — the only moving element */}
        <div className="relative my-10 flex h-44 w-44 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full border-2 border-[#86ad99]/60 ${
              phase === "in" ? "breath-in" : "breath-out"
            }`}
          />
          <div
            className={`absolute inset-6 rounded-full bg-[#86ad99]/12 ${
              phase === "in" ? "breath-in" : "breath-out"
            }`}
          />
          <span className="relative text-[0.92rem] text-[#b9c7bd]">
            {phase === "in" ? "breathe in" : "let it out"}
          </span>
        </div>

        {/* the smaller day, revealed gently after the first full breath */}
        {cycles >= 1 ? (
          <div className="answer-reveal max-w-sm space-y-3">
            <p className="text-[1rem] text-[#eef1ee]">
              Today is now just {quota} questions — a light day. That's the right size for today.
            </p>
            {skipped.length > 0 ? (
              <p className="text-[0.95rem] text-[#b9c7bd]">
                {skipped.map((s) => s.name).join(" and ")} can wait for a clearer day.
              </p>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="mt-2 rounded-lg border border-[#86ad99]/40 px-6 py-2.5 text-[0.95rem] font-semibold text-[#eef1ee] hover:bg-[#86ad99]/10"
            >
              Okay, I'm ready
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={close}
            className="mt-4 text-[0.9rem] text-[#8aa08d] underline underline-offset-2 hover:text-[#b9c7bd]"
          >
            I'd rather go on
          </button>
        )}
      </div>
    </div>
  );
}
