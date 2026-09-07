/**
 * Temporary probe — pinpoints which parts of hardening.sql are live:
 *  1. does public.is_own_student exist? (rpc call)
 *  2. are grants revoked? (anon insert error message differs:
 *     "permission denied" = revoked, "row-level security" = default grants)
 *  3. do content policies exist? (signed-in student reading seeded subjects)
 */
import { createClient } from "@supabase/supabase-js";

function loadEnv(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* ignore */
  }
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const svc = createClient(url, svcKey, { auth: { persistSession: false } });

  // 1. function existence
  const { error: fnErr } = await svc.rpc("is_own_student", {
    target_student_id: "00000000-0000-0000-0000-000000000000",
  });
  console.log(
    "1) is_own_student exists:",
    fnErr ? `NO — ${fnErr.message}` : "YES (rpc callable)"
  );

  // 2. grant state on a personal table (error message signature)
  const { error: insErr } = await anon.from("students").insert({ class_level: 8, board: "CBSE" });
  const msg = insErr?.message ?? "";
  console.log(
    "2) grants on students:",
    /permission denied/i.test(msg)
      ? "REVOKED (hardening applied)"
      : /row-level security/i.test(msg)
        ? "DEFAULT (revoke never ran)"
        : `OTHER — ${msg}`
  );

  // 3. policy state: sign in as the e2e student and read seeded subjects
  const si = await anon.auth
    .signInWithPassword({ email: "vidyamitra-e2e-student@example.com", password: "Vidyamitra-E2E-2026!" });
  if (si.error) {
    console.log("3) policy probe skipped (sign-in failed):", si.error.message);
    return;
  }
  const { data: subjects, error: subErr } = await anon.from("subjects").select("id");
  console.log(
    "3) content policy for authenticated:",
    subErr
      ? `ERROR — ${subErr.message}`
      : `subjects visible=${(subjects ?? []).length} (13 = policy live, 0 = policy missing)`
  );
}

main();
