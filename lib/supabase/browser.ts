"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client: used ONLY for Supabase Auth (sign in/up, OAuth, sessions).
 * Every data read/write goes through /api route handlers which re-verify the
 * session server-side, so the anon key never touches students/attempts/etc.
 * directly.
 */
let instance: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Vidyamitra isn't connected to Supabase yet. Ask the person who set this up to add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the .env file."
    );
  }
  instance = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce", // OAuth lands on /auth/callback with a code to exchange
      detectSessionInUrl: false, // the exchange happens explicitly on /auth/callback
    },
  });
  return instance;
}
