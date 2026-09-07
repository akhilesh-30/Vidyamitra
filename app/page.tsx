"use client";

/* Root route — v0 "knowledge field" landing. The shell provides the dark
   canvas, header and footer; the landing component is the v0 hero.
   Buttons route into the real app (auth-gated dashboard / auth pages). */

import { useRouter } from "next/navigation";
import { V0Landing } from "@/components/v0/landing";

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="v0-shell">
      <header className="site-header">
        <button className="brand" onClick={() => router.push("/")}>
          <span className="mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>VIDYAMITRA</span>
        </button>
        <nav>
          <button className="active" onClick={() => router.push("/")}>The approach</button>
          <button onClick={() => router.push("/dashboard")}>My learning</button>
          <button onClick={() => router.push("/counsellor")}>For institutions</button>
        </nav>
      </header>
      <V0Landing onStart={() => router.push("/dashboard")} />
      <footer className="site-footer">
        <span>© 2026 Vidyamitra</span>
        <span>Learn in your own light <span className="footer-mark">✦</span></span>
      </footer>
    </div>
  );
}
