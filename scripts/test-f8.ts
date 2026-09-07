/**
 * F8 live verification — counsellor API against real Supabase.
 *
 *  1. A real counsellor auth user is ensured (service role sets
 *     app_metadata.role = "counsellor").
 *  2. GET /api/counsellor as the counsellor returns the open escalation
 *     created in F7, with real student context (name/class/board) and a
 *     real check-in note; plus per-class stress trend aggregates.
 *  3. PATCH moves the F7 case open → reviewed → back to open, each change
 *     read back from the DB with the service role.
 *  4. Access control: the E2E STUDENT calling the same route gets 403; an
 *     unauthenticated call gets 401.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f8.ts
 */
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "vidyamitra-e2e-student@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Vidyamitra-E2E-2026!";
const COUNSEL_EMAIL = process.env.COUNSEL_EMAIL ?? "vidyamitra-e2e-counsellor@example.com";
const COUNSEL_PASSWORD = process.env.COUNSEL_PASSWORD ?? "Vidyamitra-Counsellor-2026!";
const BASE_URL = process.env.BASE_URL!;

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

interface Overview {
  openEscalations: {
    id: string;
    student_id: string;
    reason: string;
    status: string;
    student_name: string;
    class_level: number;
    board: string;
    checkin_note: string | null;
    checkin_emoji: string | null;
  }[];
  reviewedEscalations: unknown[];
  trend: { date: string; low: number; medium: number; high: number }[];
  byClass: { board: string; class_level: number; students: number; logs: number; recent_high: number }[];
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !svcKey) throw new Error("Missing Supabase env vars");
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
  });
  const svc = createClient(url, svcKey, { auth: { persistSession: false } });

  // ---- 1. ensure counsellor + student auth users -------------------------
  const found = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let counselUser = found.data.users.find((u) => u.email === COUNSEL_EMAIL);
  if (!counselUser) {
    const { data, error } = await svc.auth.admin.createUser({
      email: COUNSEL_EMAIL,
      password: COUNSEL_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "counsellor" },
    });
    if (error) throw new Error(`Could not create counsellor user: ${error.message}`);
    counselUser = data.user;
  } else if (counselUser.app_metadata?.role !== "counsellor") {
    await svc.auth.admin.updateUserById(counselUser.id, { app_metadata: { role: "counsellor" } });
  }
  check(
    "f8: counsellor auth user exists with app_metadata.role=counsellor",
    Boolean(counselUser),
    `${COUNSEL_EMAIL} (${counselUser!.id})`
  );

  // ---- 2. GET overview as the counsellor ---------------------------------
  const si = await anon.auth.signInWithPassword({ email: COUNSEL_EMAIL, password: COUNSEL_PASSWORD });
  if (si.error) throw new Error(`Counsellor sign-in failed: ${si.error.message}`);
  const cToken = si.data.session!.access_token;

  const res = await fetch(`${BASE_URL}/api/counsellor`, { headers: { Authorization: `Bearer ${cToken}` } });
  const json = await res.json().catch(() => null);
  const ov = json?.data as Overview | undefined;

  check(
    "f8: GET /api/counsellor allowed for counsellor role",
    res.status === 200 && Boolean(ov),
    `HTTP ${res.status}`
  );

  // The F7 escalation must appear with real student context.
  const { data: studentsRows } = await svc.from("students").select("id, name, class_level, board");
  const studentByName = (studentsRows ?? []).find((s) => s.name === "E2E Test Student");
  const open = ov?.openEscalations ?? [];
  const f7Case = open.find((e) => e.student_id === studentByName?.id);
  check(
    "f8: open escalation from F7 listed with real student context",
    Boolean(f7Case) &&
      f7Case!.student_name === "E2E Test Student" &&
      f7Case!.class_level === 8 &&
      f7Case!.board === "CBSE" &&
      typeof f7Case!.reason === "string" &&
      f7Case!.reason.length > 0,
    f7Case
      ? `student=${f7Case.student_name} (class ${f7Case.class_level} ${f7Case.board}), reason: "${f7Case.reason.slice(0, 90)}…", note: "${(f7Case.checkin_note ?? "").slice(0, 60)}…"`
      : `open cases: ${open.length}`
  );

  // Aggregate trends: at least one class row and the stress-log counts.
  const { count: logCount } = await svc
    .from("stress_logs")
    .select("id", { count: "exact", head: true });
  const byClass = ov?.byClass ?? [];
  const trend = ov?.trend ?? [];
  const trendTotals = trend.reduce((a, p) => a + p.low + p.medium + p.high, 0);
  check(
    "f8: per-class stress aggregates reflect real stress_logs data",
    byClass.length >= 1 &&
      byClass.some((c) => c.students >= 1 && c.logs >= 1) &&
      trendTotals === (logCount ?? 0),
    `classes=${byClass.length} (${byClass
      .map((c) => `${c.board} cl${c.class_level}: ${c.students} students, ${c.logs} logs, ${c.recent_high} high`)
      .join("; ")}); trend days=${trend.length}, total logs=${trendTotals} vs db=${logCount}`
  );

  // ---- 3. PATCH status open -> reviewed -> open ---------------------------
  if (f7Case) {
    const patch = async (status: string) => {
      const r = await fetch(`${BASE_URL}/api/counsellor`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${cToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: f7Case.id, status }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    };
    const p1 = await patch("reviewed");
    const { data: afterReviewed } = await svc.from("escalations").select("status").eq("id", f7Case.id).maybeSingle();
    check(
      "f8: PATCH open → reviewed persists",
      p1.status === 200 && afterReviewed?.status === "reviewed",
      `HTTP ${p1.status}, db status=${afterReviewed?.status}`
    );
    const p2 = await patch("open");
    const { data: afterOpen } = await svc.from("escalations").select("status").eq("id", f7Case.id).maybeSingle();
    check(
      "f8: PATCH reviewed → open persists (case left open for the UI build)",
      p2.status === 200 && afterOpen?.status === "open",
      `HTTP ${p2.status}, db status=${afterOpen?.status}`
    );
    const p3 = await patch("bogus");
    check(
      "f8: PATCH rejects an invalid status",
      p3.status === 400,
      `HTTP ${p3.status}: ${JSON.stringify(p3.body?.error?.message ?? "")}`
    );
  } else {
    check("f8: PATCH status flow", false, "skipped — no open escalation found");
  }

  // ---- 4. access control --------------------------------------------------
  const stu = await anon.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });
  if (stu.error) throw new Error(`Student sign-in failed: ${stu.error.message}`);
  const sToken = stu.data.session!.access_token;
  const sRes = await fetch(`${BASE_URL}/api/counsellor`, { headers: { Authorization: `Bearer ${sToken}` } });
  const sJson = await sRes.json().catch(() => null);
  check(
    "f8: student role is rejected with 403",
    sRes.status === 403 && sJson?.error?.code === "FORBIDDEN",
    `HTTP ${sRes.status} (${sJson?.error?.code ?? "no code"}): "${sJson?.error?.message ?? ""}"`
  );
  const anonRes = await fetch(`${BASE_URL}/api/counsellor`);
  const anonJson = await anonRes.json().catch(() => null);
  check(
    "f8: unauthenticated request rejected with 401",
    anonRes.status === 401,
    `HTTP ${anonRes.status} (${anonJson?.error?.code ?? "no code"})`
  );

  console.log("\nRAW — counsellor overview (trimmed):");
  console.log(
    JSON.stringify(
      {
        openEscalations: open.map((e) => ({
          student: e.student_name,
          class: `${e.board} ${e.class_level}`,
          reason: e.reason,
          status: e.status,
        })),
        byClass: ov?.byClass,
        trend: trend.slice(-3),
      },
      null,
      2
    )
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF8 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F8 live verification crashed:", e.message ?? e);
  process.exit(1);
});
