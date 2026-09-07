"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ErrorNote, Field, inputCls } from "@/components/controls";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Make your new password at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await getBrowserClient().auth.updateUser({ password });
      if (error) {
        setError("We couldn't update your password. Try again in a moment.");
        return;
      }
      await getBrowserClient().auth.signOut();
      router.replace("/login");
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      aside={
        <Link href="/login" className="font-semibold text-pine hover:text-pine-deep">
          Back to sign in
        </Link>
      }
    >
      <h1 className="font-display text-[1.7rem] font-semibold text-ink">Choose a new password</h1>
      <p className="mt-1 text-[0.95rem] text-steel">Pick something you&apos;ll remember.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error ? <ErrorNote message={error} /> : null}
        <Field label="New password" hint="At least 6 characters.">
          <input
            type="password"
            required
            autoComplete="new-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Type it again">
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
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthScreen>
  );
}
