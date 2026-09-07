"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, RequestError } from "@/lib/api/client";
import { getBrowserClient } from "@/lib/supabase/browser";

/* --------------------------------------------------------------------
   Counsellor console (F8) — deliberately NOT the student look.

   The student app is a warm ruled notebook (Fraunces serif, paper
   green). This surface is an ops/clinical tool: a cool slate canvas,
   flat white work surfaces with hairline rules, square corners, system
   sans throughout, tabular numerals. Amber is used only for the
   open-case state; nothing decorative.
   -------------------------------------------------------------------- */

interface EscalationCase {
  id: string;
  student_id: string;
  reason: string;
  status: "open" | "reviewed" | "closed";
  created_at: string;
  student_name: string | null;
  class_level: number;
  board: string;
  checkin_note: string | null;
  checkin_emoji: string | null;
}

interface ClassSummary {
  board: string;
  class_level: number;
  students: number;
  logs: number;
  recent_high: number;
}

interface TrendPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
}

interface Overview {
  openEscalations: EscalationCase[];
  reviewedEscalations: EscalationCase[];
  trend: TrendPoint[];
  byClass: ClassSummary[];
}

/* ---------- small clinical primitives ---------- */

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-28">
      <div className="text-[1.6rem] font-semibold leading-tight text-[#1a2332] tabular-nums">{value}</div>
      <div className="mt-0.5 text-[0.72rem] uppercase tracking-wider text-[#64748b]">{label}</div>
    </div>
  );
}

function CaseStatus({ status }: { status: EscalationCase["status"] }) {
  const style =
    status === "open"
      ? "bg-[#fef3c7] text-[#92400e] border-[#fcd34d]"
      : status === "reviewed"
        ? "bg-[#e0f2fe] text-[#075985] border-[#7dd3fc]"
        : "bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]";
  return (
    <span className={`inline-block border px-2 py-0.5 text-[0.72rem] font-semibold uppercase tracking-wide ${style}`}>
      {status}
    </span>
  );
}

function TrendBars({ trend }: { trend: TrendPoint[] }) {
  const days = trend.slice(-14);
  const max = Math.max(1, ...days.map((d) => d.low + d.medium + d.high));
  return (
    <div className="flex items-end gap-1" style={{ height: 56 }}>
      {days.length === 0 ? (
        <span className="text-sm text-[#64748b]">No stress logs in the last two weeks.</span>
      ) : (
        days.map((d) => {
          const total = d.low + d.medium + d.high;
          return (
            <div key={d.date} className="flex w-4 flex-col justify-end" title={`${d.date}: ${d.low} low, ${d.medium} medium, ${d.high} high`}>
              <div className="w-full bg-[#dc2626]" style={{ height: `${(d.high / max) * 56}px` }} />
              <div className="w-full bg-[#f59e0b]" style={{ height: `${(d.medium / max) * 56}px` }} />
              <div className="w-full bg-[#94a3b8]" style={{ height: `${(d.low / max) * 56}px` }} />
              <span className="sr-only">{total} logs</span>
            </div>
          );
        })
      )}
    </div>
  );
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/* ---------- case row ---------- */

function CaseRow({ c, onStatus, busy }: { c: EscalationCase; onStatus: (id: string, s: "reviewed" | "closed") => void; busy: boolean }) {
  return (
    <li className="border-b border-[#e2e8f0] px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[#1a2332]">{c.student_name ?? "Unknown student"}</span>
            <span className="text-sm text-[#64748b]">
              Class {c.class_level} · {c.board}
            </span>
            <CaseStatus status={c.status} />
            <span className="text-sm tabular-nums text-[#94a3b8]">{fmtWhen(c.created_at)}</span>
          </div>
          <p className="mt-2 text-[0.95rem] text-[#334155]">{c.reason}</p>
          {c.checkin_note ? (
            <blockquote className="mt-2 border-l-2 border-[#cbd5e1] pl-3 text-[0.95rem] text-[#475569]">
              {c.checkin_emoji ? <span className="mr-1">{c.checkin_emoji}</span> : null}“{c.checkin_note}”
            </blockquote>
          ) : null}
        </div>
        {c.status === "open" ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(c.id, "reviewed")}
              className="border border-[#cbd5e1] bg-white px-3 py-1.5 text-sm font-medium text-[#334155] hover:bg-[#f1f5f9] disabled:opacity-50"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(c.id, "closed")}
              className="border border-[#cbd5e1] bg-white px-3 py-1.5 text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-50"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/* ---------- main console ---------- */

export function CounsellorConsole() {
  const [phase, setPhase] = useState<"loading" | "signin" | "denied" | "ready" | "error">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signinError, setSigninError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyCase, setBusyCase] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<Overview>("/api/counsellor");
      setOverview(data);
      setPhase("ready");
    } catch (e) {
      if (e instanceof RequestError && e.code === "FORBIDDEN") {
        setPhase("denied");
      } else if (e instanceof RequestError && e.code === "UNAUTHENTICATED") {
        setPhase("signin");
      } else {
        setLoadError(e instanceof Error ? e.message : "Could not load the console.");
        setPhase("error");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSigningIn(true);
    setSigninError(null);
    const { error } = await getBrowserClient().auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) {
      setSigninError("That email and password don't match a counsellor account. Check them and try again.");
      return;
    }
    setPhase("loading");
    void load();
  };

  const signOut = async () => {
    await getBrowserClient().auth.signOut();
    setOverview(null);
    setPhase("signin");
  };

  const setStatus = async (id: string, status: "reviewed" | "closed") => {
    setBusyCase(true);
    try {
      await apiFetch("/api/counsellor", { method: "PATCH", body: { id, status } });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              openEscalations: prev.openEscalations.filter((c) => c.id !== id),
              reviewedEscalations: [
                { ...(prev.openEscalations.find((c) => c.id === id) as EscalationCase), status },
                ...prev.reviewedEscalations,
              ].slice(0, 20),
            }
          : prev
      );
    } catch {
      setLoadError("That didn't save. The case is still where it was — try once more.");
      window.setTimeout(() => setLoadError(null), 4000);
    } finally {
      setBusyCase(false);
    }
  };

  /* ----- phases ----- */

  if (phase === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f1f5f9] text-[#64748b]">Loading…</div>
    );
  }

  if (phase === "signin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f1f5f9] px-4">
        <form onSubmit={signIn} className="w-full max-w-sm border border-[#e2e8f0] bg-white p-8">
          <h1 className="text-lg font-semibold text-[#1a2332]">Counsellor sign-in</h1>
          <p className="mt-1 text-sm text-[#64748b]">School staff only.</p>
          <label className="mt-6 block">
            <span className="mb-1 block text-sm font-medium text-[#334155]">Work email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#cbd5e1] px-3 py-2 text-[0.95rem] text-[#1a2332] focus:border-[#2563eb] focus:outline-none"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-[#334155]">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#cbd5e1] px-3 py-2 text-[0.95rem] text-[#1a2332] focus:border-[#2563eb] focus:outline-none"
            />
          </label>
          {signinError ? <p className="mt-4 border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{signinError}</p> : null}
          <button
            type="submit"
            disabled={signingIn}
            className="mt-6 w-full bg-[#1e293b] py-2.5 text-[0.95rem] font-semibold text-white hover:bg-[#0f172a] disabled:opacity-60"
          >
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f1f5f9] px-4">
        <div className="max-w-sm border border-[#e2e8f0] bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-[#1a2332]">Counsellor access only</h1>
          <p className="mt-2 text-[0.95rem] text-[#475569]">
            This console is for school counsellors. Your account doesn't have that role — ask the school office if you
            believe you should.
          </p>
          <button type="button" onClick={signOut} className="mt-6 border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#f1f5f9]">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error" || !overview) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f1f5f9] px-4">
        <div className="max-w-sm border border-[#e2e8f0] bg-white p-8 text-center">
          <p className="text-[0.95rem] text-[#b91c1c]">{loadError ?? "Could not load the console."}</p>
          <button type="button" onClick={() => void load()} className="mt-4 border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#f1f5f9]">
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ----- ready ----- */
  const openCount = overview.openEscalations.length;
  const classes = [...overview.byClass].sort((a, b) => b.recent_high - a.recent_high || a.class_level - b.class_level);

  return (
    <div className="min-h-dvh bg-[#f1f5f9]">
      {/* top bar */}
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[1.05rem] font-semibold text-[#1a2332]">Counsellor console</span>
            <span className="text-sm text-[#94a3b8]">Vidyamitra</span>
          </div>
          <button type="button" onClick={signOut} className="text-sm font-medium text-[#64748b] hover:text-[#334155]">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* summary strip */}
        <section className="border border-[#e2e8f0] bg-white">
          <div className="flex flex-wrap gap-x-10 gap-y-4 px-5 py-4">
            <Stat label="Open cases" value={openCount} />
            <Stat label="Students" value={overview.byClass.reduce((a, c) => a + c.students, 0)} />
            <Stat label="Stress logs (14d)" value={overview.trend.reduce((a, p) => a + p.low + p.medium + p.high, 0)} />
            <Stat label="High-stress logs (14d)" value={overview.trend.reduce((a, p) => a + p.high, 0)} />
          </div>
        </section>

        {loadError ? (
          <p role="alert" className="mt-4 border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 text-[0.95rem] text-[#b91c1c]">
            {loadError}
          </p>
        ) : null}

        {/* open queue */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.05rem] font-semibold text-[#1a2332]">Open cases</h2>
            <span className="text-sm tabular-nums text-[#64748b]">{openCount} waiting</span>
          </div>
          {openCount === 0 ? (
            <p className="mt-3 border border-[#e2e8f0] bg-white px-5 py-6 text-[0.95rem] text-[#64748b]">
              No open cases. Check-ins that concern a student appear here for follow-up.
            </p>
          ) : (
            <ul className="mt-3 border border-[#e2e8f0] bg-white">
              {overview.openEscalations.map((c) => (
                <CaseRow key={c.id} c={c} onStatus={setStatus} busy={busyCase} />
              ))}
            </ul>
          )}
        </section>

        {/* class wellbeing */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border border-[#e2e8f0] bg-white">
            <h2 className="border-b border-[#e2e8f0] px-5 py-3 text-[1.05rem] font-semibold text-[#1a2332]">
              Stress trend — last 14 days
            </h2>
            <div className="px-5 py-4">
              <TrendBars trend={overview.trend} />
              <div className="mt-3 flex gap-4 text-xs text-[#64748b]">
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[#dc2626]" /> high</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[#f59e0b]" /> medium</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[#94a3b8]" /> low</span>
              </div>
            </div>
          </div>

          <div className="border border-[#e2e8f0] bg-white">
            <h2 className="border-b border-[#e2e8f0] px-5 py-3 text-[1.05rem] font-semibold text-[#1a2332]">
              By class
            </h2>
            <table className="w-full text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-xs uppercase tracking-wider text-[#94a3b8]">
                  <th className="px-5 py-2 font-medium">Class</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Students</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Logs</th>
                  <th className="px-5 py-2 text-right font-medium tabular-nums">High</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={`${c.board}-${c.class_level}`} className="border-b border-[#f1f5f9] last:border-b-0">
                    <td className="px-5 py-2.5 text-[#334155]">
                      {c.board} · Class {c.class_level}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[#475569]">{c.students}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#475569]">{c.logs}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums ${c.recent_high > 0 ? "font-semibold text-[#b91c1c]" : "text-[#94a3b8]"}`}>
                      {c.recent_high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* recently handled */}
        {overview.reviewedEscalations.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[1.05rem] font-semibold text-[#1a2332]">Recently handled</h2>
            <ul className="mt-3 border border-[#e2e8f0] bg-white">
              {overview.reviewedEscalations.map((c) => (
                <CaseRow key={c.id} c={c} onStatus={setStatus} busy={busyCase} />
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 border border-[#e2e8f0] bg-white px-5 py-4 text-sm text-[#64748b]">
          Cases are raised automatically from students' own check-ins. Follow-up is a conversation with the student, not
          a diagnosis — Vidyamitra only flags, a person decides.
        </p>
      </main>
    </div>
  );
}
