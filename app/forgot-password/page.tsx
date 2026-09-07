"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ErrorNote, Field, inputCls } from "@/components/controls";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await getBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
      });
      if (error) {
        setError("We couldn't send that. Check the email address and try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the service. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthScreen
        aside={
          <Link href="/login" className="font-semibold text-pine hover:text-pine-deep">
            Back to sign in
          </Link>
        }
      >
        <h1 className="font-display text-[1.6rem] font-semibold text-ink">Check your inbox</h1>
        <p className="mt-3 text-[0.98rem] text-steel">
          If <span className="font-semibold text-ink">{email}</span> is registered, a reset link is on its way.
          It lasts for an hour. (If you don&apos;t see it, look in spam.)
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      aside={
        <Link href="/login" className="font-semibold text-pine hover:text-pine-deep">
          Back to sign in
        </Link>
      }
    >
      <h1 className="font-display text-[1.7rem] font-semibold text-ink">Reset your password</h1>
      <p className="mt-1 text-[0.95rem] text-steel">
        Type your email and we&apos;ll send a reset link.
      </p>
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
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthScreen>
  );
}
