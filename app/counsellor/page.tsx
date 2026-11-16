"use client";

/* Counsellor console — the staff side of the loop. Students are never named in
   the peer feed; here a counsellor sees flagged check-ins, the class stress
   trend, and can move each case through open → reviewed → closed.

   Access is gated server-side by the `counsellor` role in app_metadata, which
   only server code can set. New counsellors activate with the school access
   code (COUNSELLOR_ACCESS_CODE in the server env). */

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Brain, CheckCircle2, HeartPulse, Loader2, LogOut, ShieldCheck, Users } from "lucide-react";
import { apiFetch, RequestError } from "@/lib/api/client";
import { getBrowserClient } from "@/lib/supabase/browser";
import { ErrorNote, SectionHeading, Stat } from "@/components/ui";

interface CaseRow {
  id: string;
  student_name: string | null;
  class_level: number;
  board: string;
  school: string | null;
  age: number | null;
  reason: string;
  checkin_note: string | null;
  checkin_emoji: string | null;
  status: string;
  created_at: string;
}

interface TrendPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
}

interface ClassSummary {
  board: string;
  class_level: number;
  students: number;
  logs: number;
  recent_high: number;
}

interface Overview {
  openEscalations: CaseRow[];
  reviewedEscalations: CaseRow[];
  trend: TrendPoint[];
  byClass: ClassSummary[];
  counsellorSchool: string | null;
}

type Phase = "checking" | "signed-out" | "forbidden" | "ready";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CounsellorPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [school, setSchool] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const sb = getBrowserClient();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setPhase("signed-out");
        return;
      }
      try {
        const data = await apiFetch<Overview>("/api/counsellor");
        setOverview(data);
        setPhase("ready");
      } catch (e) {
        if (e instanceof RequestError && (e.code === "FORBIDDEN" || e.status === 403)) {
          setPhase("forbidden");
        } else {
          throw e;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the counsellor console.");
      setPhase((p) => (p === "checking" ? "signed-out" : p));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await getBrowserClient().auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      setPhase("checking");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That sign-in didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/counsellor/register", {
        method: "POST",
        body: { accessCode, school },
      });
      setPhase("checking");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't activate this account.");
    } finally {
      setBusy(false);
    }
  }

  async function updateCase(id: string, status: "reviewed" | "closed" | "open") {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/counsellor", { method: "PATCH", body: { id, status } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that case.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await getBrowserClient().auth.signOut();
    setOverview(null);
    setPhase("signed-out");
  }

  const shell = (children: ReactNode) => (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503]">
            <Brain size={18} strokeWidth={2.4} />
          </span>
          <span className="display text-[17px] font-semibold">Vidyamitra</span>
          <span className="chip ml-1">Counsellors</span>
        </Link>
        {phase === "ready" ? (
          <button type="button" onClick={() => void signOut()} className="btn btn-ghost btn-sm">
            <LogOut size={14} /> Sign out
          </button>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm">Student sign in</Link>
        )}
      </header>
      {children}
    </main>
  );

  if (phase === "checking") {
    return shell(
      <div className="card flex items-center gap-3 p-6 text-[14px]">
        <Loader2 size={17} className="animate-spin text-[var(--ember)]" />
        <span className="muted">Checking your counsellor access…</span>
      </div>
    );
  }

  if (phase === "signed-out") {
    return shell(
      <div className="mx-auto max-w-md">
        <div className="card p-7 fade-up">
          <h1 className="text-2xl font-semibold">Counsellor sign in</h1>
          <p className="muted mt-1.5 text-[13.5px] leading-relaxed">
            Use the school account you activated with your counsellor access code.
          </p>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="c-email">Email</label>
              <input
                id="c-email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="counsellor@school.edu"
              />
            </div>
            <div>
              <label className="label" htmlFor="c-password">Password</label>
              <input
                id="c-password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            {error ? <p className="field-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
            </button>
          </form>
          <p className="faint mt-5 text-[12px] leading-relaxed">
            No counsellor account yet? Create a normal account from{" "}
            <Link href="/signup" className="underline">sign up</Link>, then come back here and enter your
            school&apos;s access code.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "forbidden") {
    return shell(
      <div className="mx-auto max-w-md">
        <div className="card p-7 fade-up">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[rgba(143,185,150,0.12)] text-[var(--sage)]">
            <ShieldCheck size={20} />
          </span>
          <h1 className="text-2xl font-semibold">Activate counsellor access</h1>
          <p className="muted mt-1.5 text-[13.5px] leading-relaxed">
            This account is signed in but isn&apos;t a counsellor yet. Enter the access code your school
            coordinator gave you.
          </p>
          <form onSubmit={activate} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="c-code">Access code</label>
              <input
                id="c-code"
                required
                className="input"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Shared by your school"
              />
            </div>
            <div>
              <label className="label" htmlFor="c-school">School name</label>
              <input
                id="c-school"
                required
                className="input"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Exactly as students type it"
              />
            </div>
            {error ? <p className="field-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Activate"}
            </button>
          </form>
          <p className="faint mt-5 text-[12px] leading-relaxed">
            No code, or the server says it isn&apos;t configured? Ask whoever runs Vidyamitra to set
            COUNSELLOR_ACCESS_CODE, then try again.
          </p>
        </div>
      </div>
    );
  }

  const data = overview;
  const open = data?.openEscalations ?? [];
  const reviewed = data?.reviewedEscalations ?? [];
  const trend = data?.trend ?? [];
  const maxDay = Math.max(1, ...trend.map((d) => d.low + d.medium + d.high));
  const totalStudents = (data?.byClass ?? []).reduce((a, c) => a + c.students, 0);
  const highSignals = (data?.byClass ?? []).reduce((a, c) => a + c.recent_high, 0);

  return shell(
    <div className="space-y-6">
      <div className="fade-up">
        <span className="eyebrow"><span className="eyebrow-dot" /> Counsellor console</span>
        <h1 className="mt-3 text-3xl font-semibold">Who needs a quiet check-in</h1>
        <p className="muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Every case below started with a student&apos;s own check-in, a peer post, or Lily Ai&apos;s safety screen.
          {data?.counsellorSchool ? ` Scoped to ${data.counsellorSchool}.` : ""}
        </p>
      </div>

      {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="open cases" value={open.length} tone="rose" />
        <Stat label="students" value={totalStudents} tone="sky" />
        <Stat label="high signals" value={highSignals} hint="last 14 days" />
        <Stat label="closed" value={reviewed.length} tone="sage" />
      </div>

      <section className="card p-5">
        <SectionHeading title="Open cases" hint="Newest first. Nothing here is visible to classmates." />
        {open.length === 0 ? (
          <p className="muted flex items-center gap-2 py-4 text-[13.5px]">
            <CheckCircle2 size={16} className="text-[var(--sage)]" /> Nothing open right now — the queue is clear.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((c) => (
              <li key={c.id} className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14.5px] font-semibold">
                    {c.student_name || "Unnamed student"}
                    <span className="faint ml-2 text-[12px] font-normal">
                      Class {c.class_level} · {c.board === "CBSE" ? "CBSE" : "Maharashtra"}
                      {c.school ? ` · ${c.school}` : ""}
                      {c.age ? ` · age ${c.age}` : ""}
                    </span>
                  </p>
                  <span className="faint text-[11.5px]">{when(c.created_at)}</span>
                </div>
                <p className="muted mt-2 text-[13px] leading-relaxed">{c.reason}</p>
                {c.checkin_note ? (
                  <p className="mt-2 rounded-lg bg-[rgba(242,237,227,0.03)] p-2.5 text-[12.5px] leading-relaxed">
                    {c.checkin_emoji ? `${c.checkin_emoji} ` : ""}
                    {c.checkin_note}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => void updateCase(c.id, "reviewed")}
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => void updateCase(c.id, "closed")}
                  >
                    Close case
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <SectionHeading
          title="Stress signals, last 14 days"
          hint="Derived from attempt accuracy, latency, late-night work and abandonment."
          right={<HeartPulse size={17} className="text-[var(--rose)]" />}
        />
        {trend.length === 0 ? (
          <p className="muted py-3 text-[13px]">No stress logs yet. They appear once students practise.</p>
        ) : (
          <>
            <div className="flex h-28 items-end gap-1.5">
              {trend.map((d) => {
                const total = d.low + d.medium + d.high;
                return (
                  <div
                    key={d.date}
                    className="flex h-full min-w-2 flex-1 flex-col justify-end"
                    title={`${d.date}: ${d.low} low · ${d.medium} medium · ${d.high} high`}
                  >
                    <div className="w-full rounded-t-[2px] bg-[var(--rose)] opacity-70" style={{ height: `${(d.high / maxDay) * 100}%` }} />
                    <div className="w-full bg-[var(--ember)] opacity-70" style={{ height: `${(d.medium / maxDay) * 100}%` }} />
                    <div className="w-full bg-[var(--sage)] opacity-70" style={{ height: `${(d.low / maxDay) * 100}%` }} />
                    {total === 0 ? <div className="h-0.5 w-full bg-[var(--line)]" /> : null}
                  </div>
                );
              })}
            </div>
            <div className="faint mt-3 flex flex-wrap items-center gap-4 text-[11.5px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--sage)]" /> low</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--ember)]" /> medium</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--rose)]" /> high</span>
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <SectionHeading title="By class" hint="Where the pressure is pooling." right={<Users size={17} className="text-[var(--sky)]" />} />
        {!data?.byClass.length ? (
          <p className="muted py-3 text-[13px]">No classes to summarise yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {data.byClass.map((c) => (
              <li key={`${c.board}-${c.class_level}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
                <span className="font-medium">
                  Class {c.class_level} · {c.board === "CBSE" ? "CBSE" : "Maharashtra"}
                </span>
                <span className="faint">
                  {c.students} student{c.students === 1 ? "" : "s"} · {c.logs} logs
                  {c.recent_high > 0 ? <span className="ml-2 text-[var(--rose)]">{c.recent_high} high</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewed.length > 0 ? (
        <section className="card p-5">
          <SectionHeading title="Recently handled" hint="Kept for continuity — reopen if something changes." />
          <ul className="divide-y divide-[var(--line)]">
            {reviewed.slice(0, 8).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-[13px]">
                  {c.student_name || "Unnamed student"}
                  <span className="faint ml-2 text-[11.5px]">Class {c.class_level} · {c.status}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => void updateCase(c.id, "open")}
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="faint pb-4 text-center text-[12px]">
        In an emergency, point students to Tele-MANAS 14416 (free, 24×7). Vidyamitra is a nudge, not a replacement for care.
      </p>
    </div>
  );
}
