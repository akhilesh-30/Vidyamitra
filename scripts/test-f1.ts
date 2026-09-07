/**
 * F1 end-to-end — auth + onboarding against the LIVE Supabase project.
 *
 *   1. Ensures a real test student exists in Supabase Auth (signUp through
 *      the same anon-key client the browser uses; if the project requires
 *      email confirmation, the admin API confirms the address — the exact
 *      equivalent of the student clicking the magic link — then signs in).
 *   2. Onboarding: if BASE_URL is set, drives the app's real HTTP routes
 *      (/api/onboarding, /api/me) with the student's bearer token and
 *      checks the `students` row is written.
 *   3. RLS as the signed-in student: own row visible, alien row rejected,
 *      content readable, escalations unreachable.
 *
 * Usage (with the Next dev server running):
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f1.ts
 */
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "vidyamitra-e2e-student@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Vidyamitra-E2E-2026!";
const BASE_URL = process.env.BASE_URL;

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
const results: Result[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n       ${detail}`);
};

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !svcKey) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
  }

  // Browser-equivalent client: anon key, exactly like the frontend.
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
  });
  const svc = createClient(url, svcKey, { auth: { persistSession: false } });

  // ---- 1. Real auth sign-up / sign-in -------------------------------
  const existing = await svc.auth.admin
    .listUsers({ page: 1, perPage: 1000 })
    .then((r) => r.data.users.find((u) => u.email === E2E_EMAIL));
  if (!existing) {
    const { error } = await svc.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true, // stands in for the student clicking the confirmation link
    });
    if (error) throw new Error(`Could not create E2E auth user: ${error.message}`);
  }

  let session = null;
  try {
    const r = await anon.auth.signUp({ email: E2E_EMAIL, password: E2E_PASSWORD });
    session = r.data.session;
    if (r.error && !/already registered/i.test(r.error.message)) throw r.error;
  } catch {
    /* fall through to sign-in below */
  }
  if (!session) {
    const si = await anon.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });
    if (si.error) throw new Error(`Sign-in failed: ${si.error.message}`);
    session = si.data.session;
  }
  const uid = session!.user.id;
  check("auth: test student signed in via anon-key client", true, `${E2E_EMAIL} (uid ${uid})`);
  const token = session!.access_token;

  // ---- 2. Onboarding through the app's real HTTP routes -------------
  if (BASE_URL) {
    const onboard = (body: unknown) =>
      fetch(`${BASE_URL}/api/onboarding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

    const first = await onboard({ name: "E2E Test Student", class_level: 8, board: "CBSE" });
    const s = first.json?.data?.student;
    check(
      "onboarding: /api/onboarding wrote students row",
      first.status === 200 && s?.class_level === 8 && s?.board === "CBSE",
      `HTTP ${first.status}${s ? `, student id ${s.id}` : `, ${JSON.stringify(first.json)}`}`
    );

    const second = await onboard({ name: "E2E Test Student", class_level: 9, board: "CBSE" });
    const s2 = second.json?.data?.student;
    check(
      "onboarding: re-POST updates, does not duplicate",
      second.status === 200 && s2?.id === s?.id && s2?.class_level === 9,
      `HTTP ${second.status}, same id=${s2?.id === s?.id}, class_level now ${s2?.class_level}`
    );
    // restore class 8 for the rest of the test suite
    await onboard({ name: "E2E Test Student", class_level: 8, board: "CBSE" });

    const me = await fetch(`${BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
    check(
      "onboarding: /api/me returns the student",
      me.status === 200 && me.json?.data?.student?.id === s?.id,
      `HTTP ${me.status}, student ${me.json?.data?.student?.id}`
    );

    const denied = await fetch(`${BASE_URL}/api/me`, { headers: {} }).then((r) => r.status);
    check("onboarding: unauthenticated /api/me is rejected", denied === 401, `HTTP ${denied} (expected 401)`);
  } else {
    console.log("SKIP  HTTP route section (set BASE_URL to a running dev server)");
    // Still ensure a students row exists so RLS checks below have data.
    const { data: existingRow } = await svc
      .from("students")
      .select("id")
      .eq("auth_user_id", uid)
      .maybeSingle();
    if (!existingRow) {
      const { error } = await svc.from("students").insert({
        auth_user_id: uid,
        name: "E2E Test Student",
        class_level: 8,
        board: "CBSE",
      });
      if (error) throw new Error(`Could not create students row: ${error.message}`);
    }
  }

  // ---- 3. RLS behaviour as the signed-in student --------------------
  const myRow = await anon.from("students").select("id, auth_user_id, class_level, board");
  check(
    "rls: student sees their own students row",
    !myRow.error && (myRow.data ?? []).length === 1 && myRow.data![0].auth_user_id === uid,
    myRow.error
      ? `ERROR ${myRow.error.message}`
      : `${(myRow.data ?? []).length} row(s), auth_user_id matches uid`
  );

  const alien = await anon
    .from("students")
    .insert({ auth_user_id: crypto.randomUUID(), class_level: 8, board: "CBSE" });
  check(
    "rls: student cannot create a row for someone else",
    Boolean(alien.error),
    alien.error ? `rejected — ${alien.error.message}` : "NOT REJECTED — alien row inserted"
  );

  const content = await anon.from("subjects").select("id").limit(5);
  check(
    "rls: content tables readable by signed-in student",
    !content.error,
    content.error ? `ERROR ${content.error.message}` : `HTTP ok, ${(content.data ?? []).length} row(s) (empty until F2 seed)`
  );

  const esc = await anon.from("escalations").select("id").limit(1);
  check(
    "rls: escalations unreachable for students",
    Boolean(esc.error),
    esc.error ? `blocked — ${esc.error.message}` : "NOT BLOCKED — escalations visible"
  );

  const attempts = await anon.from("attempts").select("id").limit(1);
  check(
    "rls: own attempts readable (empty is fine)",
    !attempts.error,
    attempts.error ? `ERROR ${attempts.error.message}` : "readable"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF1 end-to-end: all checks passed." : `\n${failed} check(s) failed.`);
  console.log(`Reusable test account: ${E2E_EMAIL} / ${E2E_PASSWORD}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F1 end-to-end crashed:", e.message ?? e);
  process.exit(1);
});
