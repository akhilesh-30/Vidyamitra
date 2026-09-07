"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ErrorNote, Field, inputCls } from "@/components/controls";
import { GoogleButton } from "@/components/google-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already signed in, go straight to the app.
  useEffect(() => {
    getBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/dashboard");
      })
      .catch(() => undefined);
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await getBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("password")) {
          setError("That email and password don't match. Double-check them and try again.");
        } else if (m.includes("email not confirmed")) {
          setError("This email hasn't been confirmed yet. Open the confirmation link we sent, then sign in.");
        } else {
          setError("Couldn't sign you in. Try again in a moment.");
        }
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      aside={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-pine hover:text-pine-deep">
            Create an account
          </Link>{" "}
          — it takes a minute.
        </>
      }
    >
      <h1 className="font-display text-[1.7rem] font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 text-[0.95rem] text-steel">Sign in and pick up where you left off.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error ? <ErrorNote message={error} /> : null}
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-[0.9rem] font-medium text-pine hover:text-pine-deep"
          >
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm text-steel">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton onError={setError} />
    </AuthScreen>
  );
}
