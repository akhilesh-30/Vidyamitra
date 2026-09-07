"use client";

/* Dashboard — v0 "knowledge field" visuals over the existing real-data
   logic: same useAuth gate and /api/dashboard fetch as before. When the
   latest stress log is high, the v0 breathing screen is offered. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, RequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { V0Dashboard, type DashboardData } from "@/components/v0/dashboard";
import { V0Breathing } from "@/components/v0/breathing";

export default function DashboardPage() {
  const router = useRouter();
  const { state, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await apiFetch<DashboardData>("/api/dashboard");
      setData(d);
      if (d.latestStress?.stress_score === "high") {
        setBreakOpen(true);
      }
    } catch (e) {
      if (e instanceof RequestError && (e.code === "UNAUTHENTICATED" || e.code === "NO_PROFILE")) throw e;
      setLoadError("Couldn't load your page just now. Check your internet and try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ----- auth gates ----- */
  if (state.status === "loading") {
    return <div className="v0-shell" style={{ display: "grid", placeItems: "center" }}>Loading…</div>;
  }
  if (state.status === "anon" || state.status === "error") {
    return (
      <div className="v0-shell" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p>Your session has run out. Sign in again and you&apos;ll be right back.</p>
          <Link href="/login" className="button button-primary" style={{ marginTop: 18, display: "inline-flex" }}>
            Go to sign-in
          </Link>
        </div>
      </div>
    );
  }
  if (state.status === "no-profile") {
    return (
      <div className="v0-shell" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p>Almost there — we just need to know your class and board before you start.</p>
          <Link href="/onboarding" className="button button-primary" style={{ marginTop: 18, display: "inline-flex" }}>
            Finish setting up
          </Link>
        </div>
      </div>
    );
  }

  const student = state.student;

  if (!data) {
    return (
      <div className="v0-shell">
        <header className="site-header">
          <span className="brand"><span className="mark" aria-hidden="true"><span /><span /><span /><span /></span><span>VIDYAMITRA</span></span>
          <nav>
            <button className="active">My learning</button>
            <button onClick={signOut}>Sign out</button>
          </nav>
        </header>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "var(--muted)" }}>
          {loadError ?? "Shaping today's field…"}
        </div>
      </div>
    );
  }

  return (
    <div className="v0-shell">
      <header className="site-header">
        <button className="brand" onClick={() => router.push("/")}>
          <span className="mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>VIDYAMITRA</span>
        </button>
        <nav>
          <button className="active" onClick={() => router.push("/dashboard")}>My learning</button>
          <button onClick={() => router.push("/progress")}>Progress</button>
          <button onClick={() => router.push("/practice")}>Practice</button>
          <button onClick={signOut}>Sign out</button>
        </nav>
      </header>

      {breakOpen && data.latestStress?.stress_score === "high" ? (
        <V0Breathing
          quota={data.plan.quota}
          skipped={data.plan.skipped}
          onReturn={() => setBreakOpen(false)}
        />
      ) : null}

      <V0Dashboard
        data={{
          student: {
            name: student.name,
            class_level: student.class_level,
            board: student.board,
          },
          syllabus: data.syllabus,
          plan: data.plan,
          latestStress: data.latestStress,
        }}
        onBreak={() => setBreakOpen(true)}
      />

      <footer className="site-footer">
        <span>© 2026 Vidyamitra</span>
        <span>Learn in your own light <span className="footer-mark">✦</span></span>
      </footer>
    </div>
  );
}
