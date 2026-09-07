/**
 * F6 live verification — adaptive pacing reacts to REAL high stress.
 *
 * A second, separate test student ("E2E Stress Student") is staged from raw
 * material: real `attempts` rows inserted with evidence that exercises all
 * four F5 signals at once —
 *
 *   1. baseline (5 days back, 16:00 IST): 10 easy correct answers at ~24s →
 *      the student's own normal.
 *   2. an abandoned session (~00:30 IST, ≥50 min ago): 2 wrong, quick
 *      answers, then nothing for hours → a session that ended on a wrong
 *      answer within minutes.
 *   3. a struggling session (~01:30 IST): 6 answers, 1 correct, 150–190s
 *      each, ending ≥55 min ago with a 20+ min spread → long, wrong, late.
 *
 * `attempted_at` is set explicitly on insert (service role), so the rows are
 * the genuine raw material — the derivation itself is untouched app code:
 * /api/practice/finish recomputes mastery + stress from these rows, then the
 * plan is read back from /api/dashboard exactly as the student UI gets it.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f6.ts
 */
import { createClient } from "@supabase/supabase-js";

const STRESS_EMAIL = process.env.STRESS_EMAIL ?? "vidyamitra-e2e-stressed@example.com";
const STRESS_PASSWORD = process.env.STRESS_PASSWORD ?? "Vidyamitra-E2E-2026!";
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

const IST_OFFSET_MS = 5.5 * 3_600_000;

/** UTC ISO for "today at H:MM IST", one or more days back (IST = UTC+5:30). */
function istUtc(daysBack: number, h: number, m: number): string {
  const now = Date.now();
  const istNow = new Date(now + IST_OFFSET_MS);
  // midnight IST of the day `daysBack` days before today (IST):
  // UTC midnight of the wall date, minus the 5:30 IST offset.
  const istMidnight =
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) -
    daysBack * 86_400_000 -
    IST_OFFSET_MS;
  return new Date(istMidnight + (h * 60 + m) * 60_000).toISOString();
}

/** minutes from now until the given ISO moment (negative = in the past). */
function minutesFromNow(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 60_000;
}

/**
 * UTC instant for a concrete IST wall-clock time (daysBack 0 = today).
 */
function istAnchor(daysBack: number, h: number, m: number): number {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const midnightIst =
    Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) -
    daysBack * 86_400_000 -
    IST_OFFSET_MS;
  return midnightIst + (h * 60 + m) * 60_000;
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

  // ---- 1. ensure the stressed test student exists ------------------------
  const found = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!found.data.users.some((u) => u.email === STRESS_EMAIL)) {
    const { error } = await svc.auth.admin.createUser({
      email: STRESS_EMAIL,
      password: STRESS_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Could not create stress user: ${error.message}`);
  }
  const si = await anon.auth.signInWithPassword({ email: STRESS_EMAIL, password: STRESS_PASSWORD });
  if (si.error) throw new Error(`Sign-in failed: ${si.error.message}`);
  const token = si.data.session!.access_token;

  // Onboard through the app's real route (F1 path), then reset derived rows
  // so this run's evidence is exactly what we staged.
  const onboardRes = await fetch(`${BASE_URL}/api/onboarding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Stress Student", class_level: 8, board: "CBSE" }),
  });
  const onboard = await onboardRes.json().catch(() => null);
  const studentId = onboard?.data?.student?.id as string | undefined;
  if (!studentId) throw new Error(`Onboarding failed: HTTP ${onboardRes.status}`);
  await svc.from("attempts").delete().eq("student_id", studentId);
  await svc.from("mastery_scores").delete().eq("student_id", studentId);
  await svc.from("stress_logs").delete().eq("student_id", studentId);

  // ---- 2. pull a pool of real seeded questions ---------------------------
  const { data: qs, error: qErr } = await svc
    .from("questions")
    .select("id, topic_id")
    .order("topic_id")
    .limit(40);
  if (qErr || !qs || qs.length < 20) throw new Error(`Need seeded questions: ${qErr?.message}`);
  const pool = qs as { id: string; topic_id: string }[];

  // ---- 3. stage the evidence (real attempts rows, explicit timestamps) ---
  const now = Date.now();
  const H = 3_600_000;

  // 3a. baseline: 5 days back, 16:00–16:14 IST, 100% correct, quick.
  const baselineRows = Array.from({ length: 10 }, (_, i) => ({
    student_id: studentId,
    question_id: pool[i].id,
    is_correct: true,
    time_taken_seconds: 20 + (i % 3) * 4,
    attempted_at: istUtc(5, 16, i),
  }));

  // 3b/3c. Two late-night sessions from a PAIRED anchor set, so they are
  // always >45 min apart (the model's session gap) and both late-night,
  // closed, and inside the 24h window:
  //   pair 1 — struggle 01:30–01:50, abandoned 03:00–03:06 IST (same night)
  //   pair 2 — abandoned 21:30–21:36, struggle 23:00–23:20 IST (last night)
  const pairs: { struggle: [number, number, number]; abandoned: [number, number, number] }[] = [
    { struggle: [0, 1, 30], abandoned: [0, 3, 0] },
    { struggle: [1, 23, 0], abandoned: [1, 21, 30] },
  ];
  const validAge = (t: number) => {
    const ageH = (Date.now() - t) / 3_600_000;
    return ageH >= 1.25 && ageH <= 23;
  };
  const pair = pairs.find(
    (p) => validAge(istAnchor(...p.struggle)) && validAge(istAnchor(...p.abandoned))
  );
  if (!pair) throw new Error("no valid late-night pair at this clock time");

  const abandonedRows = [0, 1].map((i) => ({
    student_id: studentId,
    question_id: pool[10 + i].id,
    is_correct: false,
    time_taken_seconds: i === 0 ? 95 : 130,
    attempted_at: new Date(istAnchor(...pair.abandoned) + i * 3 * 60_000).toISOString(),
  }));

  const struggleRows = Array.from({ length: 6 }, (_, i) => ({
    student_id: studentId,
    question_id: pool[12 + i].id,
    is_correct: i === 0, // 1 of 6 → 17% recent accuracy
    time_taken_seconds: 150 + i * 8, // 150–190s vs ~24s baseline
    attempted_at: new Date(istAnchor(...pair.struggle) + i * 4 * 60_000).toISOString(),
  }));

  const stage = [...baselineRows, ...abandonedRows, ...struggleRows];
  const { error: insErr } = await svc.from("attempts").insert(stage);
  if (insErr) throw new Error(`Staging attempts failed: ${insErr.message}`);
  const { count: attemptCount } = await svc
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  check(
    "f6: stressed student staged with real attempts rows",
    attemptCount === stage.length,
    `${attemptCount} rows: 10 baseline (5d ago, 100% right, ~24s) · 2 abandoned (~00:30 IST, wrong) · 6 struggling (~01:30 IST, 17% right, 150–190s)`
  );

  // Self-check the placement against the model's own thresholds, so a FAIL
  // below can never be a silent staging mistake.
  const placement = {
    recent: stage.filter((r) => now - new Date(r.attempted_at).getTime() <= 24 * H && now - new Date(r.attempted_at).getTime() >= 0).length,
    baseline: stage.filter((r) => {
      const ageH = (now - new Date(r.attempted_at).getTime()) / H;
      return ageH > 24 && ageH <= 8 * 24;
    }).length,
    lateNight: stage.filter((r) => {
      const ist = new Date(new Date(r.attempted_at).getTime() + IST_OFFSET_MS);
      const h = ist.getUTCHours();
      return h >= 22 || h < 5;
    }).length,
    struggleSessionClosed: minutesFromNow(stage[stage.length - 1].attempted_at) <= -45,
    struggleSessionSpreadMin: 20,
    abandonedSessionClosed: minutesFromNow(abandonedRows[1].attempted_at) <= -45,
  };
  check(
    "f6: staging self-check — windows, hours and session-closure per model thresholds",
    placement.recent === 8 &&
      placement.baseline === 10 &&
      placement.lateNight === 8 &&
      placement.struggleSessionClosed &&
      placement.abandonedSessionClosed,
    `recent24h=${placement.recent}/8, baseline=${placement.baseline}/10, lateNightIST=${placement.lateNight}/8, struggle closed=${placement.struggleSessionClosed} (spread 20min), abandoned closed=${placement.abandonedSessionClosed}`
  );

  // ---- 4. run the app's real end-of-session derivation -------------------
  const finishRes = await fetch(`${BASE_URL}/api/practice/finish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const finish = await finishRes.json().catch(() => null);
  const fin = finish?.data as {
    masteryUpdates?: { topic_id: string; topic_name: string; mastery: number }[];
    stress?: { score: string; signals: Record<string, { detected: boolean; reason: string; detail: string }> } | null;
    plan?: {
      quota: number;
      quotaReason: string;
      queue: { topic_id: string; name: string; kind: string }[];
      skipped: { topic_id: string; name: string; reason: string }[];
    };
  };
  check(
    "f5: finish derives HIGH stress from the staged rows",
    finishRes.status === 200 && fin?.stress?.score === "high",
    fin?.stress ? `score=${fin.stress.score}` : `stress=null (HTTP ${finishRes.status})`
  );

  const sig = fin?.stress?.signals ?? {};
  const fired = Object.entries(sig)
    .filter(([, v]) => v?.detected)
    .map(([k]) => k);
  check(
    "f5: signals explain why — all four fired with plain-language reasons",
    ["accuracy_drop", "avg_latency", "late_night", "abandon_rate"].every((k) => sig[k]?.detected === true),
    fired.length ? `fired: ${fired.join(", ")}` : `fired: none — ${JSON.stringify(sig)}`
  );

  const quota = fin?.plan?.quota;
  check(
    "f6: quota dropped to the high-stress level (5)",
    quota === 5,
    `quota=${quota} (default 12, first-session 8) — reason: ${JSON.stringify(fin?.plan?.quotaReason)}`
  );

  const skipped = fin?.plan?.skipped ?? [];
  check(
    "f6: pending topics rescheduled — a fresh chapter postponed with a plain reason",
    skipped.length >= 1 && skipped.every((s) => /Postponed|can wait|skip/i.test(s.reason)),
    skipped.length ? skipped.map((s) => `"${s.name}" — ${s.reason}`).join(" | ") : "nothing skipped"
  );
  // Full accounting of the 13-chapter syllabus in the new plan: queued work
  // + postponed topics + mastered-but-not-due review topics (spaced review
  // correctly stays out of today's queue until its interval comes around).
  const dashPre = await fetch(`${BASE_URL}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  const dashPreJson = await dashPre.json().catch(() => null);
  const allTopics = ((dashPreJson?.data?.syllabus ?? []) as { topics: { mastery: number | null }[] }[]).flatMap((s) => s.topics);
  const notDueReview = allTopics.filter((t) => (t.mastery ?? 0) >= 0.7).length;
  check(
    "f6: plan accounts for the whole syllabus (queue + postponed + spaced review)",
    (fin?.plan?.queue?.length ?? 0) + skipped.length + notDueReview === allTopics.length,
    `queue=${fin?.plan?.queue?.length} + postponed=${skipped.length} + review-not-due=${notDueReview} = ${allTopics.length} chapters`
  );

  // ---- 5. stress_logs row written, dashboard reflects the new plan --------
  const { data: logs } = await svc
    .from("stress_logs")
    .select("stress_score, signals, logged_at")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(1);
  const latest = (logs?.[0] ?? null) as {
    stress_score: string;
    signals: Record<string, { detected: boolean; reason: string; detail: string }>;
    logged_at: string;
  } | null;
  check(
    "f5: stress_logs row persisted with score=high",
    latest?.stress_score === "high",
    latest ? `logged at ${latest.logged_at}` : "no row"
  );

  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  const dash = await dashRes.json().catch(() => null);
  check(
    "f6: dashboard reflects high stress + trimmed plan (break flag)",
    dashRes.status === 200 &&
      dash?.data?.latestStress?.stress_score === "high" &&
      dash?.data?.plan?.quota === 5 &&
      (dash?.data?.plan?.skipped?.length ?? 0) >= 1,
    `latestStress=${dash?.data?.latestStress?.stress_score}, quota=${dash?.data?.plan?.quota}, skipped=${dash?.data?.plan?.skipped?.length}`
  );

  // nextQuestion must respect the trimmed plan: the student is only served
  // questions from queued topics, never from postponed ones.
  const nextRes = await fetch(`${BASE_URL}/api/practice/next`, { headers: { Authorization: `Bearer ${token}` } });
  const next = await nextRes.json().catch(() => null);
  const nq = next?.data as { question_id: string; topic_id: string; topic_name: string; quota: number } | null;
  const skippedIds = new Set(skipped.map((s) => s.topic_id));
  check(
    "f6: next question served within the trimmed plan (never from a postponed topic)",
    nextRes.status === 200 && Boolean(nq?.question_id) && !skippedIds.has(nq!.topic_id) && nq?.quota === 5,
    nq ? `topic="${nq.topic_name}", quota=${nq.quota}` : `HTTP ${nextRes.status}`
  );

  console.log("\nRAW — stress signals (why the app says high):");
  console.log(JSON.stringify(sig, null, 2));
  console.log("\nRAW — plan after finish:");
  console.log(
    JSON.stringify(
      {
        quota: fin?.plan?.quota,
        quotaReason: fin?.plan?.quotaReason,
        skipped: fin?.plan?.skipped,
        queueHead: fin?.plan?.queue?.slice(0, 3),
      },
      null,
      2
    )
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF6 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F6 live verification crashed:", e.message ?? e);
  process.exit(1);
});
