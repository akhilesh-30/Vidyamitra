"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { apiFetch } from "@/lib/api/client";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ErrorNote, Field, inputCls } from "@/components/controls";
import type { StudentRow } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState(8);
  const [board, setBoard] = useState<"CBSE" | "MAHARASHTRA">("CBSE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { student } = await apiFetch<{ student: StudentRow }>("/api/onboarding", {
        method: "POST",
        body: { name: name.trim(), class_level: classLevel, board },
      });
      if (student) router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AuthScreen>
        <p className="text-steel">One moment…</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <h1 className="font-display text-[1.7rem] font-semibold text-ink">Tell us about your school</h1>
      <p className="mt-1 text-[0.95rem] text-steel">
        This picks the right syllabus. You can change it later.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {error ? <ErrorNote message={error} /> : null}

        <Field label="What should we call you?" hint="Your first name is fine — only you and your school counsellor see it.">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ananya"
            maxLength={60}
          />
        </Field>

        <Field label="Which class are you in?">
          <select
            className={inputCls}
            value={classLevel}
            onChange={(e) => setClassLevel(Number(e.target.value))}
          >
            {[6, 7, 8, 9, 10].map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </Field>

        <fieldset>
          <legend className="mb-2 block text-[0.95rem] font-semibold text-ink">Which board is your school?</legend>
          <div className="space-y-2">
            {(
              [
                ["CBSE", "Central Board of Secondary Education"],
                ["MAHARASHTRA", "Maharashtra State Board"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[0.95rem] transition-colors ${
                  board === value ? "border-pine bg-mist/60" : "border-line bg-card hover:bg-mist/30"
                }`}
              >
                <input
                  type="radio"
                  name="board"
                  value={value}
                  checked={board === value}
                  onChange={() => setBoard(value)}
                  className="h-4 w-4 accent-[var(--pine)]"
                />
                <span className="font-medium text-ink">{value === "CBSE" ? "CBSE" : "Maharashtra Board"}</span>
                <span className="ml-auto text-sm text-steel">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Setting things up…" : "Start learning"}
        </Button>
      </form>
    </AuthScreen>
  );
}
