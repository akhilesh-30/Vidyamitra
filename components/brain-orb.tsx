"use client";

/* The mind, in one calm image: a glowing brain drawn with pure SVG —
   no three.js, no WebGL, a few kilobytes instead of a megabyte. It tilts
   toward the cursor and brightens when touched: responsive, but gentle. */

import { useRef, useState } from "react";

export default function BrainOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(false);
  const timer = useRef<number | null>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-dy * 14).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(dx * 18).toFixed(2)}deg`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  function onDown() {
    setBurst(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBurst(false), 900);
  }

  const hemi =
    "M110 30 C 82 22 48 36 42 66 C 37 88 42 108 54 122 C 64 134 78 143 94 148 C 100 150 106 149 110 145 Z";
  const gyri = [
    "M50 62 C 60 54 70 62 64 72 C 60 79 50 78 48 70",
    "M56 100 C 66 94 76 102 70 112",
    "M78 46 C 86 40 96 46 92 56",
    "M74 128 C 82 122 92 128 88 138",
    "M92 70 C 100 64 108 70 104 80",
    "M62 84 C 68 80 74 84 70 90",
  ];

  return (
    <div
      ref={ref}
      className={`brain-orb ${burst ? "burst" : ""}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      role="img"
      aria-label="A glowing brain of light — touch it and it brightens"
    >
      <span className="orb-ring r1" />
      <span className="orb-ring r2" />
      <div className="orb-tilt">
        <svg viewBox="0 0 220 190" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vb-stroke" x1="20" y1="20" x2="200" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f0b25a" />
              <stop offset="1" stopColor="#a99bd8" />
            </linearGradient>
            <radialGradient id="vb-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(240,178,90,0.2)" />
              <stop offset="1" stopColor="rgba(240,178,90,0)" />
            </radialGradient>
          </defs>

          <ellipse cx="110" cy="95" rx="100" ry="88" fill="url(#vb-glow)" />

          <g stroke="url(#vb-stroke)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={hemi} fill="rgba(240,178,90,0.07)" />
            <path d={hemi} fill="rgba(169,155,216,0.07)" transform="matrix(-1 0 0 1 220 0)" />

            <path d="M110 34 C 104 60 116 84 110 108 C 106 124 108 136 110 144" strokeWidth="3" opacity="0.9" />

            <g opacity="0.75" strokeWidth="2">
              {gyri.map((d, i) => <path key={i} d={d} />)}
            </g>
            <g opacity="0.75" strokeWidth="2" transform="matrix(-1 0 0 1 220 0)">
              {gyri.map((d, i) => <path key={i} d={d} />)}
            </g>

            <path d="M110 148 C 108 158 102 164 94 172" strokeWidth="2.6" opacity="0.9" />
          </g>
        </svg>
        <span className="orb-syn s1" />
        <span className="orb-syn s2" />
        <span className="orb-syn s3" />
        <span className="orb-syn s4" />
        <span className="orb-syn s5" />
        <span className="orb-syn s6" />
      </div>
    </div>
  );
}
