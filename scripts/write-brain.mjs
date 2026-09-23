import { writeFileSync } from "node:fs";

/* Overwrites components/three/brain.tsx with a lightweight SVG-brain wrapper.
   The old implementation pulled in three.js + @react-three/fiber (~1 MB) just
   for a particle blob; the new one delegates to <BrainOrb /> (few KB, still
   interactive). app/page.tsx keeps importing `BrainCanvas` unchanged. */

const tsx = `"use client";

/* The landing hero brain.

   This used to mount a three.js particle scene (~1 MB of WebGL payload before
   hydration). It is now a thin wrapper around <BrainOrb /> — a pure SVG brain,
   CSS-animated, that still reacts to hover / touch / pointer movement but
   paints instantly and ships a fraction of the JavaScript. */

import BrainOrb from "@/components/brain-orb";

export default function BrainCanvas({ className }: { className?: string }) {
  return (
    <div className={className}>
      <BrainOrb />
    </div>
  );
}
`;

writeFileSync("components/three/brain.tsx", tsx, "utf8");
console.log("components/three/brain.tsx swapped,", tsx.length, "bytes");
