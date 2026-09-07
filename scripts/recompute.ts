/**
 * Offline recompute job — F4 + F5 derivation for every student.
 * Same pure models as the app: read real attempts → write mastery_scores
 * and stress_logs. Designed to be run from a scheduler (cron) or manually:
 *
 *   npm run recompute
 *
 * The hosted equivalent is GET /api/cron/recompute (Vercel cron sends the
 * CRON_SECRET header automatically).
 */
import { createClient } from "@supabase/supabase-js";
import { computeTopicMastery } from "../lib/compute/mastery";
import { assessStress, type StressAttempt } from "../lib/compute/stress";
import { hoursAgo } from "../lib/time";

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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: students, error: sErr } = await sb.from("students").select("id");
  if (sErr) throw new Error(sErr.message);
  const now = new Date().toISOString();

  let masteryRows = 0;
  let stressRows = 0;

  for (const student of students ?? []) {
    const sid = student.id as string;

    // mastery: last 90 days of attempts, grouped by topic
    const { data: attempts, error: aErr } = await sb
      .from("attempts")
      .select("is_correct, attempted_at, questions(difficulty, topic_id)")
      .eq("student_id", sid)
      .gte("attempted_at", new Date(Date.now() - 90 * 24 * 3_600_000).toISOString());
    if (aErr) throw new Error(aErr.message);

    const byTopic = new Map<string, { is_correct: boolean; attempted_at: string }[]>();
    for (const raw of attempts ?? []) {
      const q = Array.isArray(raw.questions) ? raw.questions[0] : raw.questions;
      if (!q) continue;
      const list = byTopic.get(q.topic_id) ?? [];
      list.push({ is_correct: raw.is_correct ?? false, attempted_at: raw.attempted_at });
      byTopic.set(q.topic_id, list);
    }
    for (const [topicId, rows] of byTopic) {
      const { mastery } = computeTopicMastery(rows, now);
      const { data: existing } = await sb
        .from("mastery_scores")
        .select("id")
        .eq("student_id", sid)
        .eq("topic_id", topicId)
        .maybeSingle();
      if (existing) {
        await sb.from("mastery_scores").update({ mastery, updated_at: now }).eq("id", existing.id as string);
      } else {
        await sb.from("mastery_scores").insert({ student_id: sid, topic_id: topicId, mastery, updated_at: now });
      }
      masteryRows++;
    }

    // stress: last 8 days, with 6h dedupe against the latest log
    const { data: logs, error: lErr } = await sb
      .from("attempts")
      .select("is_correct, time_taken_seconds, attempted_at")
      .eq("student_id", sid)
      .gte("attempted_at", new Date(Date.now() - 8 * 24 * 3_600_000).toISOString());
    if (lErr) throw new Error(lErr.message);

    const stressAttempts = (logs ?? []) as StressAttempt[];
    const assessment = assessStress(stressAttempts, now);
    if (assessment.score) {
      const { data: latest } = await sb
        .from("stress_logs")
        .select("stress_score, logged_at")
        .eq("student_id", sid)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const skip =
        latest &&
        hoursAgo(latest.logged_at as string, now) < 6 &&
        latest.stress_score === assessment.score;
      if (!skip) {
        await sb.from("stress_logs").insert({
          student_id: sid,
          stress_score: assessment.score,
          signals: assessment.signals,
        });
        stressRows++;
      }
    }
  }

  console.log(`Recompute finished at ${now}`);
  console.log(`  students: ${(students ?? []).length}`);
  console.log(`  mastery_scores written/updated: ${masteryRows}`);
  console.log(`  stress_logs written: ${stressRows}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
