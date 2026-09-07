/**
 * F7 live verification — mood check-in & escalation against real Supabase.
 *
 * The E2E student posts four real check-ins through the app's own route:
 *
 *   1. benign  ("😊" + a normal note)         -> stored, NOT flagged
 *   2. concern + neutral emoji ("🙂" + "so much pressure")
 *                                             -> stored, NOT flagged
 *      (concern words alone are not enough — they need a low mood too)
 *   3. concern + low emoji ("😔" + "i give up") -> stored, FLAGGED
 *   4. serious phrase ("😭" + "i feel like giving up on everything")
 *      — worded so it contains the serious phrase "give up on everything"
 *                                             -> stored, FLAGGED
 *
 * Any concern/serious check-in only escalates when no OPEN escalation
 * already exists for the student (one open case at a time), so step 4 may
 * merge into step 3's case — the test asserts the real invariant, not a
 * fixed count.
 *
 * Every verdict is cross-checked against rows read back from the database
 * with the service role, not just the route's own response.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f7.ts
 */
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "vidyamitra-e2e-student@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Vidyamitra-E2E-2026!";
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

interface CheckinResponse {
  checkin: { id: string; mood_emoji: string | null; note: string | null; flagged: boolean; created_at: string };
  escalated: boolean;
  reason: string | null;
}

type CheckinResponseWithStatus = CheckinResponse & { status: number };

async function postCheckin(token: string, emoji: string, note: string): Promise<CheckinResponseWithStatus> {
  const res = await fetch(`${BASE_URL}/api/checkin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mood_emoji: emoji, note }),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ...(json?.data ?? {}) } as CheckinResponseWithStatus;
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

  // ---- sign in as the E2E student (real Supabase auth) -------------------
  const si = await anon.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });
  if (si.error) throw new Error(`Sign-in failed: ${si.error.message}`);
  const token = si.data.session!.access_token;

  const onboardRes = await fetch(`${BASE_URL}/api/onboarding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Test Student", class_level: 8, board: "CBSE" }),
  });
  const onboard = await onboardRes.json().catch(() => null);
  const studentId = onboard?.data?.student?.id as string | undefined;
  if (!studentId) throw new Error(`Onboarding failed: HTTP ${onboardRes.status}`);

  // Snapshot pre-existing escalations so the test only judges what IT creates.
  // Any pre-existing OPEN case is closed first (the counsellor action this
  // test emulates) so the run starts from a clean queue and the escalation
  // *creation* path is actually exercised.
  const { data: preEsc } = await svc
    .from("escalations")
    .select("id, status, reason")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  const preEscalations = (preEsc ?? []) as { id: string; status: string; reason: string }[];
  const preOpenRows = preEscalations.filter((e) => e.status === "open");
  if (preOpenRows.length > 0) {
    await svc.from("escalations").update({ status: "closed" }).in(
      "id",
      preOpenRows.map((e) => e.id)
    );
  }
  const preOpen = preOpenRows.length;
  console.log(
    `context: ${preEscalations.length} pre-existing escalations for ${E2E_EMAIL} (${preOpen} open — closed by the test to exercise creation)`
  );

  // ---- 1. benign check-in: stored, not flagged ---------------------------
  const r1 = await postCheckin(token, "😊", "Finished the rational numbers chapter today, felt good about it.");
  check(
    "f7: benign check-in accepted and stored unflagged",
    r1.status === 200 && Boolean(r1.checkin?.id) && r1.checkin.flagged === false && r1.escalated === false,
    r1.checkin?.id
      ? `id=${r1.checkin.id}, emoji=${r1.checkin.mood_emoji}, flagged=${r1.checkin.flagged}, escalated=${r1.escalated}`
      : `HTTP ${r1.status}: ${JSON.stringify(r1).slice(0, 200)}`
  );

  // ---- 2. concern words alone (neutral emoji): NOT flagged ----------------
  const r2 = await postCheckin(token, "🙂", "The syllabus feels like so much pressure before the test.");
  check(
    "f7: concern words with a neutral mood do NOT escalate",
    r2.status === 200 && Boolean(r2.checkin?.id) && r2.escalated === false,
    r2.checkin?.id ? `flagged=${r2.checkin.flagged}, escalated=${r2.escalated}` : `HTTP ${r2.status}`
  );

  // ---- 3. concern words + low emoji: FLAGGED ------------------------------
  const r3 = await postCheckin(token, "😔", "Honestly i give up on keeping up with maths.");
  check(
    "f7: concern words with a low mood DO escalate",
    r3.status === 200 && Boolean(r3.checkin?.id) && r3.escalated === true && Boolean(r3.reason),
    r3.escalated ? `reason: ${r3.reason}` : `escalated=${r3.escalated} (HTTP ${r3.status})`
  );

  // ---- 4. serious phrase: check-in FLAGGED; escalation merges into the
  // already-open case (one open case per student), but the check-in itself
  // must still carry flagged=true.
  const r4 = await postCheckin(token, "😭", "Everything is pointless, i want to give up on everything.");
  const openAfter = preOpen > 0 || r3.escalated; // one open case at a time
  check(
    "f7: serious phrase stored flagged; escalation invariant respected",
    r4.status === 200 && Boolean(r4.checkin?.id) && r4.checkin.flagged === true,
    `flagged=${r4.checkin?.flagged}, escalated=${r4.escalated} (${openAfter ? "merged into the already-open case" : "new case expected"}), reason: ${r4.reason ?? "—"}`
  );

  // ---- read everything back from the DB independently ---------------------
  const { data: checkinRows } = await svc
    .from("checkins")
    .select("id, mood_emoji, note, flagged, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (checkinRows ?? []) as { id: string; mood_emoji: string | null; note: string | null; flagged: boolean }[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  check(
    "db: all four check-ins exist as real rows with the right flagged state",
    [r1, r2, r3, r4].every(
      (r) => r.checkin && byId.get(r.checkin.id) !== undefined && byId.get(r.checkin.id)!.flagged === r.checkin.flagged
    ),
    `${[r1, r2, r3, r4].map((r) => `${r.checkin?.mood_emoji}:${byId.get(r.checkin?.id ?? "")?.flagged ?? "?"}`).join("  ")}`
  );

  const { data: escRows } = await svc
    .from("escalations")
    .select("id, checkin_id, reason, status, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  const escalations = (escRows ?? []) as { id: string; checkin_id: string | null; reason: string; status: string }[];
  const newEsc = escalations.filter(
    (e) => e.checkin_id === r3.checkin?.id || e.checkin_id === r4.checkin?.id
  );
  check(
    "db: escalation rows reference the flagged check-ins with a real reason",
    newEsc.length >= 1 && newEsc.every((e) => Boolean(e.reason) && e.status === "open"),
    newEsc.length
      ? newEsc.map((e) => `[${e.status}] ${e.reason?.slice(0, 110)}`).join(" | ")
      : "no escalation rows referencing this run's check-ins"
  );
  check(
    "db: at most one OPEN escalation per student (queue invariant)",
    escalations.filter((e) => e.status === "open").length === 1,
    `${escalations.filter((e) => e.status === "open").length} open of ${escalations.length} total for this student`
  );

  console.log("\nRAW — DB rows created by this run:");
  console.log(
    JSON.stringify(
      {
        checkins: [r1, r2, r3, r4].map((r) => ({
          emoji: r.checkin?.mood_emoji,
          note: r.checkin?.note,
          flagged: byId.get(r.checkin?.id ?? "")?.flagged,
        })),
        escalations: newEsc.map((e) => ({ status: e.status, reason: e.reason })),
      },
      null,
      2
    )
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF7 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F7 live verification crashed:", e.message ?? e);
  process.exit(1);
});
