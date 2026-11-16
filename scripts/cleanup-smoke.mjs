/**
 * Remove accounts left behind by scripts/smoke.mjs.
 *
 *   node scripts/cleanup-smoke.mjs
 *
 * Finds auth users whose email starts with `codebuff.smoke.`, deletes their
 * dependent rows in FK order, then the student row, then the auth user.
 * Safe to run repeatedly; prints nothing secret.
 */
process.loadEnvFile?.(".env.local");

const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SB || !SERVICE) {
  console.error("Missing Supabase env values in .env.local");
  process.exit(1);
}

const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const jsonSvc = { ...svc, "Content-Type": "application/json" };

const PREFIX = "codebuff.smoke.";
const CHILD_TABLES = ["escalations", "attempts", "mastery_scores", "stress_logs", "checkins"];

async function listSmokeUsers() {
  const found = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${SB}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: jsonSvc });
    if (!res.ok) {
      console.error(`Could not list users: HTTP ${res.status} ${(await res.text()).slice(0, 140)}`);
      break;
    }
    const body = await res.json();
    const users = body.users ?? [];
    for (const u of users) if ((u.email ?? "").startsWith(PREFIX)) found.push(u);
    if (users.length < 200) break;
    page += 1;
  }
  return found;
}

const users = await listSmokeUsers();
if (users.length === 0) {
  console.log("No smoke-test accounts left behind.");
  process.exit(0);
}

console.log(`Found ${users.length} smoke account(s).\n`);

for (const u of users) {
  const students = await (
    await fetch(`${SB}/rest/v1/students?auth_user_id=eq.${u.id}&select=id`, { headers: svc })
  ).json();
  const ids = Array.isArray(students) ? students.map((s) => s.id) : [];

  for (const id of ids) {
    for (const t of CHILD_TABLES) {
      const r = await fetch(`${SB}/rest/v1/${t}?student_id=eq.${id}`, { method: "DELETE", headers: svc });
      if (!r.ok && r.status !== 404) console.log(`  ${t} delete -> HTTP ${r.status}`);
    }
    const r = await fetch(`${SB}/rest/v1/students?id=eq.${id}`, { method: "DELETE", headers: svc });
    if (!r.ok) console.log(`  students delete -> HTTP ${r.status}`);
  }

  const delUser = await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc });
  console.log(
    `  ${u.email}  rows=${ids.length}  user=${delUser.ok ? "deleted" : `HTTP ${delUser.status}`}`
  );
}

const left = await listSmokeUsers();
console.log(left.length === 0 ? "\nAll smoke accounts removed." : `\n${left.length} still present.`);
process.exit(left.length === 0 ? 0 : 1);
