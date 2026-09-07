"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { apiFetch } from "@/lib/api/client";
import { AuthScreen } from "@/components/auth-screen";

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
          setMessage("That sign-in link didn't work. It may have been used already — try signing in again.");
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
    <AuthScreen>
      <h1 className="font-display text-[1.6rem] font-semibold text-ink">Almost there</h1>
      <p className="mt-3 text-[0.98rem] text-steel">{message}</p>
      <p className="mt-6">
        <Link href="/login" className="text-[0.92rem] font-semibold text-pine hover:text-pine-deep">
          Back to sign in
        </Link>
      </p>
    </AuthScreen>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
