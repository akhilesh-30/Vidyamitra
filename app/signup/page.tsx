"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ErrorNote, Field, inputCls } from "@/components/controls";
import { GoogleButton } from "@/components/google-button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Make your password at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match. Type them again carefully.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await getBrowserClient().auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered") || m.includes("exists")) {
          setError("That email already has an account — sign in instead.");
        } else if (m.includes("password")) {
          setError("That password isn't allowed. Use at least 6 characters.");
        } else {
          setError("Couldn't create your account. Try again in a moment.");
        }
        return;
      }
      if (data.session) {
        router.replace("/onboarding");
      } else {
        // Email confirmation is on for this project.
        setCheckEmail(email.trim());
      }
    } catch {
      setError("Couldn't reach the sign-up service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthScreen
        aside={
          <Link href="/login" className="font-semibold text-pine hover:text-pine-deep">
            Back to sign in
          </Link>
        }
      >
        <h1 className="font-display text-[1.6rem] font-semibold text-ink">One more step</h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-steel">
          We sent a confirmation link to <span className="font-semibold text-ink">{checkEmail}</span>. Open it,
          then come back and sign in. If it&apos;s not there in a couple of minutes, check the spam folder.
        </p>
        <div className="mt-6">
          <Link href="/login" className="block text-center">
            <Button type="button" variant="ghost" className="w-full">
              I&apos;ve confirmed — take me to sign in
            </Button>
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      aside={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-pine hover:text-pine-deep">
            Sign in
          </Link>
        </>
      }
    >
      <h1 className="font-display text-[1.7rem] font-semibold text-ink">Create your account</h1>
      <p className="mt-1 text-[0.95rem] text-steel">We&apos;ll set up your syllabus right after this.</p>

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
        <Field label="Password" hint="At least 6 characters.">
          <input
            type="password"
            required
            autoComplete="new-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Type the password again">
          <input
            type="password"
            required
            autoComplete="new-password"
            className={inputCls}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating your account…" : "Create account"}
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
