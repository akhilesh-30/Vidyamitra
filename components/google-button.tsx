"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { btnGhost } from "@/components/controls";

export function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not enabled") || msg.includes("provider") || msg.includes("unsupported")) {
          onError("Google sign-in isn't switched on for this app yet — email works fine.");
        } else {
          onError("Google sign-in didn't start. Try again, or use email instead.");
        }
      }
    } catch {
      onError("Google sign-in didn't start. Try again, or use email instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className={`${btnGhost} w-full`}>
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
        />
      </svg>
      {busy ? "Connecting to Google…" : "Continue with Google"}
    </button>
  );
}
