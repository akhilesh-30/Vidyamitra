/**
 * Connection check — run this first when pointed at a fresh Supabase project.
 *
 * Uses the SAME credentials and client library the frontend uses
 * (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY, plain
 * @supabase/supabase-js) and asks PostgREST for every row in `subjects`.
 * Prints the raw response so connection and RLS behaviour are visible.
 *
 *   npx tsx scripts/test-connection.ts
 */
import { createClient } from "@supabase/supabase-js";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      /* try the next one */
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
    process.exit(1);
  }

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error, status, statusText } = await sb
    .from("subjects")
    .select("*");

  console.log("Supabase URL      :", url);
  console.log("HTTP status       :", status, statusText);
  if (error) {
    console.log("ERROR             :", JSON.stringify(error, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("Rows returned     :", Array.isArray(data) ? data.length : "?");
  console.log("RAW RESULT        :");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
