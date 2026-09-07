/**
 * RLS verification — run AFTER supabase/hardening.sql has been applied in
 * the Supabase SQL editor.
 *
 * Checks the anon-key (signed-out) surface of the lockdown:
 *   ✔ content tables answer 200 (empty array when signed out, never an error)
 *   ✔ students / attempts / escalations are unreachable (permission denied)
 *   ✔ content tables reject writes from the anon key
 *
 * The signed-in (authenticated) half — a student reading/writing only their
 * own rows — is verified by the F1 end-to-end flow after a real sign-up.
 *
 *   npx tsx scripts/verify-rls.ts
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

type Result = { name: string; ok: boolean; detail: string };

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Result[] = [];
  const http = (n: number | null) => (n == null ? "-" : String(n));

  // 1. Signed-out read of a content table → 200 + [] (RLS filters, no error).
  {
    const { data, error, status } = await sb.from("subjects").select("*");
    results.push({
      name: "anon read subjects (content)",
      ok: !error && Array.isArray(data),
      detail: error
        ? `ERROR ${http(status)} ${error.message}`
        : `HTTP ${http(status)}, ${Array.isArray(data) ? data.length : "?"} rows (expected [] when signed out)`,
    });
  }

  // 2–3. Personal + escalation tables are invisible to the anon key.
  for (const table of ["students", "attempts", "escalations"]) {
    const { data, error, status } = await sb.from(table).select("*").limit(1);
    results.push({
      name: `anon read ${table} (personal/escalation)`,
      ok: Boolean(error), // permission denied is the goal
      detail: error
        ? `blocked as intended — ${error.message} (HTTP ${http(status)})`
        : `NOT BLOCKED — returned ${Array.isArray(data) ? (data as unknown[]).length : "?"} rows`,
    });
  }

  // 4–5. Content tables reject writes from the anon key.
  {
    const { error, status } = await sb
      .from("questions")
      .insert({ question_text: "rls probe", difficulty: 1 });
    results.push({
      name: "anon insert questions (content write)",
      ok: Boolean(error),
      detail: error ? `blocked as intended — ${error.message}` : "NOT BLOCKED — insert succeeded",
    });
  }
  {
    const { error, status } = await sb
      .from("attempts")
      .insert({ student_id: "00000000-0000-0000-0000-000000000000", is_correct: true });
    results.push({
      name: "anon insert attempts (personal write)",
      ok: Boolean(error),
      detail: error ? `blocked as intended — ${error.message}` : "NOT BLOCKED — insert succeeded",
    });
  }

  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}\n       ${r.detail}`);
    if (!r.ok) failed++;
  }
  console.log(failed === 0 ? "\nAll anon-key lockdown checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
