"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { apiFetch } from "@/lib/api/client";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const sb = getBrowserClient();
      const code = params.get("code");
      const err = params.get("error");
      const next = params.get("next") || "/";

      if (err) {
        setMessage("That sign-in link didn't work. It may have expired — try signing in again.");
        return;
      }

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("That link was already used or has expired — please sign in again.");
          return;
        }
      }

      if (next === "/reset") {
        router.replace("/reset");
        return;
      }

      try {
        await apiFetch<{ student: unknown }>("/api/me");
        if (!cancelled) router.replace("/dashboard");
      } catch (e) {
        if (!cancelled) {
          const code_ = (e as { code?: string }).code;
          router.replace(code_ === "NO_PROFILE" ? "/onboarding" : "/login");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="card w-full max-w-md p-8 text-center fade-up">
        <span className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503] glow">
          <Brain size={21} strokeWidth={2.4} />
        </span>
        <Loader2 size={18} className="mx-auto mb-4 animate-spin text-[var(--text-3)]" />
        <p className="text-[15px]">{message}</p>
        <Link href="/login" className="btn btn-ghost btn-sm mt-6">Back to sign in</Link>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
