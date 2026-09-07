"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { apiFetch } from "@/lib/api/client";
import type { StudentRow } from "@/lib/types";

export type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "no-profile" }
  | { status: "error"; message: string }
  | { status: "ready"; student: StudentRow };

export function useAuth(): {
  state: AuthState;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const started = useRef(false);

  const check = useCallback(async () => {
    const sb = getBrowserClient();
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      setState({ status: "anon" });
      return;
    }
    try {
      const { student } = await apiFetch<{ student: StudentRow }>("/api/me");
      setState({ status: "ready", student });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "NO_PROFILE") setState({ status: "no-profile" });
      else if (code === "UNAUTHENTICATED") setState({ status: "anon" });
      else setState({ status: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void check();
  }, [check]);

  const signOut = useCallback(async () => {
    await getBrowserClient().auth.signOut();
    setState({ status: "anon" });
  }, []);

  return { state, refresh: check, signOut };
}
