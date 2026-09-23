"use client";

/* Shared auth surface — one calm card, four modes (signin / signup /
   forgot / reset). Supabase email+password via the browser client. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brain, Loader2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";

export type AuthMode = "signin" | "signup" | "forgot" | "reset";

const COPY: Record<AuthMode, { title: string; sub: string; cta: string }> = {
  signin: { title: "Welcome back", sub: "Your topics are waiting right where you left them.", cta: "Sign in" },
  signup: { title: "Begin gently", sub: "Two minutes to set up, then learning meets you at your pace.", cta: "Create account" },
  forgot: { title: "Locked out?", sub: "We'll email you a calm little reset link.", cta: "Send reset link" },
  reset: { title: "Choose a new password", sub: "Make it memorable — a line you love works great.", cta: "Update password" },
};

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const copy = COPY[mode];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const sb = getBrowserClient();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setInfo("Account created! Check your email for a confirmation link, then sign in.");
        }
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset`,
        });
        if (error) throw error;
        setInfo("Reset link sent. Peek into your inbox (and spam, just in case).");
      } else {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setInfo("Password updated. Taking you in…");
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(
        msg.includes("Invalid login") ? "That email and password don't match. Try again?" :
        msg.includes("already registered") ? "This email already has an account — try signing in instead." :
        msg.includes("Password should be") ? "Passwords need at least 6 characters." :
        msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503] glow">
            <Brain size={20} strokeWidth={2.4} />
          </span>
          <span className="display text-xl font-semibold">Vidyamitra</span>
        </Link>

        <div className="card p-7 fade-up">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="muted mt-1.5 text-[14px]">{copy.sub}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="label" htmlFor="password">
                  {mode === "reset" ? "New password" : "Password"}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && <p className="field-error">{error}</p>}
            {info && <p className="sage text-[13px]">{info}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : copy.cta}
            </button>
          </form>

          <div className="divider my-6" />
          <div className="muted flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            {mode !== "signin" && <Link href="/login" className="hover:text-[var(--ember)]">Sign in</Link>}
            {mode !== "signup" && <Link href="/signup" className="hover:text-[var(--ember)]">Create account</Link>}
            {mode !== "forgot" && <Link href="/forgot-password" className="hover:text-[var(--ember)]">Forgot password?</Link>}
          </div>
        </div>
      </div>
    </main>
  );
}
