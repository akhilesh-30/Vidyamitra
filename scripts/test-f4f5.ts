/**
 * F4/F5 live verification — mastery + stress derived from REAL attempts.
 *
 *   1. POST /api/practice/finish for the E2E student (the same call the app
 *      makes at the end of a session).
 *   2. Verifies mastery_scores rows were written for every attempted topic,
 *      and that each stored value equals what computeTopicMastery produces
 *      when run independently over the raw attempts rows fetched back.
 *   3. Verifies a stress_logs row was written with a real score and the
 *      four explainable signals (accuracy_drop / avg_latency / late_night /
 *      abandon_rate), each with a plain-language reason.
 *   4. Confirms /api/dashboard now reflects mastery + latestStress.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f4f5.ts
 */
import { createClient } from "@supabase/supabase-js";
import { computeTopicMastery } from "../lib/compute/mastery";

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

  const found = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!found.data.users.some((u) => u.email === E2E_EMAIL)) {
    const { error } = await svc.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Could not create E2E user: ${error.message}`);
  }
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

  // ---- what real attempts exist for this student? ----------------------
  const { data: attempts } = await svc
    .from("attempts")
    .select("id, question_id, is_correct, time_taken_seconds, attempted_at, questions(topic_id)")
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: true });
  const rows = (attempts ?? []) as {
    id: string;
    question_id: string;
    is_correct: boolean;
    time_taken_seconds: number | null;
    attempted_at: string;
    questions: { topic_id: string } | { topic_id: string }[] | null;
  }[];
  const topicOf = (r: (typeof rows)[number]) =>
    Array.isArray(r.questions) ? r.questions[0]?.topic_id : (r.questions?.topic_id ?? null);
  const topicIds = [...new Set(rows.map(topicOf).filter(Boolean))] as string[];
  check("f4: real attempts exist to derive from", rows.length >= 4 && topicIds.length > 0, `${rows.length} attempts across ${topicIds.length} topic(s)`);
  if (rows.length < 4) {
    console.log("Need more attempts before F4/F5 can judge. Run scripts/test-f3.ts first.");
    process.exitCode = 1;
    return;
  }

  // ---- independent expected mastery per topic --------------------------
  const expected = new Map<string, number>();
  for (const t of topicIds) {
    const ev = rows
      .filter((r) => topicOf(r) === t)
      .map((r) => ({ is_correct: r.is_correct, attempted_at: r.attempted_at }));
    expected.set(t, computeTopicMastery(ev).mastery);
  }

  // ---- the app's end-of-session derivation -----------------------------
  const finishRes = await fetch(`${BASE_URL}/api/practice/finish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const finish = await finishRes.json().catch(() => null);
  const fin = finish?.data as {
    masteryUpdates?: { topic_id: string; topic_name: string; mastery: number }[];
    stress?: { score: string; signals: Record<string, { detected: boolean; reason: string }> } | null;
    plan?: { quota: number; queue: unknown[] };
  };
  check(
    "f4: /api/practice/finish returned mastery updates",
    finishRes.status === 200 && Array.isArray(fin?.masteryUpdates) && fin.masteryUpdates!.length === topicIds.length,
    `HTTP ${finishRes.status}, updates=${fin?.masteryUpdates?.length} (expected ${topicIds.length})`
  );
  check(
    "f5: finish returned a stress verdict with signals",
    finishRes.status === 200 && Boolean(fin?.stress?.score) && Boolean(fin?.stress?.signals),
    fin?.stress ? `score=${fin.stress.score}, signals=[${Object.keys(fin.stress.signals).join(", ")}]` : "stress null"
  );

  // ---- read the derived rows back from the DB --------------------------
  const { data: masteryRows } = await svc
    .from("mastery_scores")
    .select("topic_id, mastery, updated_at")
    .eq("student_id", studentId);
  const byTopic = new Map((masteryRows ?? []).map((m) => [m.topic_id as string, m]));
  const match = topicIds.every(
    (t) => byTopic.has(t) && Math.abs((byTopic.get(t)!.mastery as number) - (expected.get(t) ?? -1)) < 1e-9
  );
  check(
    "f4: mastery_scores rows written & match independent computation",
    match,
    topicIds
      .map((t) => `stored=${(byTopic.get(t)?.mastery as number | undefined)?.toFixed(3)} expected=${expected.get(t)?.toFixed(3)}`)
      .join(" | ")
  );

  const { data: stressLogs } = await svc
    .from("stress_logs")
    .select("stress_score, signals, logged_at")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(1);
  const latest = (stressLogs?.[0] ?? null) as {
    stress_score: string;
    signals: Record<string, { detected: boolean; reason: string }>;
    logged_at: string;
  } | null;
  const sig = latest?.signals ?? {};
  check(
    "f5: stress_logs row written with real signals",
    Boolean(latest) && ["accuracy_drop", "avg_latency", "late_night", "abandon_rate"].every((k) => k in sig),
    latest
      ? `score=${latest.stress_score} at ${latest.logged_at}; reasons: ${Object.values(sig)
          .map((s) => s.reason)
          .join(" · ")}`
      : "no row"
  );

  // ---- dashboard reflects the derived state ----------------------------
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  const dash = await dashRes.json().catch(() => null);
  const syllabus = (dash?.data?.syllabus ?? []) as {
    topics: { topic: { id: string }; mastery: number | null; updated_at: string | null }[];
  }[];
  const topicStates = syllabus.flatMap((s) => s.topics);
  const attemptedStates = topicStates.filter((t) => topicIds.includes(t.topic.id));
  check(
    "f4: dashboard shows mastery on attempted topics",
    dashRes.status === 200 &&
      attemptedStates.length === topicIds.length &&
      attemptedStates.every((t) => typeof t.mastery === "number" && t.mastery >= 0 && t.mastery <= 1 && t.updated_at),
    attemptedStates.map((t) => `${(t.mastery ?? 0).toFixed(2)}`).join(", ")
  );
  check(
    "f5: dashboard carries latest stress + plan",
    Boolean(dash?.data?.latestStress?.stress_score) && typeof dash?.data?.plan?.quota === "number",
    `latestStress=${dash?.data?.latestStress?.stress_score}, quota=${dash?.data?.plan?.quota}, queue=${dash?.data?.plan?.queue?.length}`
  );

  console.log("\nRAW — finish response (mastery + stress):");
  console.log(
    JSON.stringify(
      {
        masteryUpdates: fin?.masteryUpdates?.map((m) => ({ topic: m.topic_name, mastery: Number(m.mastery.toFixed(3)) })),
        stress: fin?.stress && { score: fin.stress.score, signals: fin.stress.signals },
      },
      null,
      2
    )
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF4/F5 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F4/F5 live verification crashed:", e.message ?? e);
  process.exit(1);
});
