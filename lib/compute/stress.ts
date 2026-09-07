/**
 * F5 — stress from behaviour, written from the raw `attempts` log.
 *
 * Four signals are judged, each against recent work (last 24h) versus that
 * student's own baseline (days 2–8 back), so a slow morning never reads as
 * stress for a student who is normally quick:
 *
 *   1. accuracy_drop  — recent accuracy well below baseline
 *   2. avg_latency    — questions taking much longer than baseline
 *   3. late_night     — a big share of work happening when they should be asleep
 *                       (22:00–05:00 in IST, the board the app is built for)
 *   4. abandon_rate   — short sessions that end on a wrong answer and stop
 *
 * Signals are combined into a plain score and each signal records *why* it
 * fired, in a sentence a 13-year-old (or a counsellor) can read back.
 * Pure function of real rows only — no fake numbers, ever.
 */

import { hourInTz, isLateNightHour } from "@/lib/time";
import type { StressLevel } from "@/lib/types";

export interface StressAttempt {
  is_correct: boolean;
  time_taken_seconds: number | null;
  attempted_at: string; // ISO UTC
}

export interface SignalEvidence {
  detected: boolean;
  reason: string;
  detail: string;
  /** numeric size where useful (accuracy drop fraction, latency ratio) */
  magnitude?: number;
}

export type StressSignals = {
  accuracy_drop: SignalEvidence;
  avg_latency: SignalEvidence;
  late_night: SignalEvidence;
  abandon_rate: SignalEvidence;
};

export interface StressAssessment {
  /** null = not enough recent behaviour yet to say anything honest */
  score: StressLevel | null;
  signals: StressSignals;
}

/* ----- tunable thresholds (exported so tests pin them) ----- */

export const STRESS_RECENT_HOURS = 24;
export const STRESS_BASELINE_MAX_HOURS = 8 * 24; // window: 24h..8 days
export const STRESS_MIN_RECENT = 4; // attempts needed in the last 24h to judge
export const STRESS_MIN_BASELINE = 6; // attempts needed for a fair baseline
export const STRESS_ABS_LOW_ACC = 0.5; // fallback accuracy when no baseline
export const STRESS_ACC_DROP_MODERATE = 0.15; // percentage-point drop
// (a strong drop doesn't need its own constant — 2+ signals read as high)
export const STRESS_LATENCY_RATIO = 1.6; // recent mean vs baseline mean
export const STRESS_LATENCY_ABS_S = 100; // fallback "stuck" threshold
export const STRESS_LATE_SHARE = 0.5;
export const STRESS_LATE_MIN_COUNT = 3;
export const SESSION_GAP_MIN = 45; // gap that separates two sessions
export const SESSION_CLOSED_AFTER_MIN = 45; // session counts as closed
export const SESSION_MAX_SHORT_MIN = 8;
export const SESSION_SHORT_MAX_ATTEMPTS = 2;

/* ------------------------- helpers ------------------------- */

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function accuracy(xs: StressAttempt[]): number | null {
  if (xs.length === 0) return null;
  return xs.filter((a) => a.is_correct).length / xs.length;
}

interface Session {
  attempts: StressAttempt[];
  startMs: number;
  endMs: number;
}

/** Group attempts into sessions by idle gaps, oldest first. */
export function clusterSessions(attempts: StressAttempt[]): Session[] {
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
  );
  const sessions: Session[] = [];
  for (const a of sorted) {
    const ms = new Date(a.attempted_at).getTime();
    const last = sessions[sessions.length - 1];
    if (last && ms - last.endMs > SESSION_GAP_MIN * 60_000) {
      sessions.push({ attempts: [a], startMs: ms, endMs: ms });
    } else if (last) {
      last.attempts.push(a);
      last.endMs = ms;
    } else {
      sessions.push({ attempts: [a], startMs: ms, endMs: ms });
    }
  }
  return sessions;
}

function assessAccuracyDrop(recent: StressAttempt[], baseline: StressAttempt[]): SignalEvidence {
  const recentAcc = accuracy(recent) ?? 0;
  const baseAcc = accuracy(baseline);

  if (baseAcc === null) {
    // No history yet: only an honestly bad recent stretch counts.
    if (recent.length >= STRESS_MIN_RECENT && recentAcc < STRESS_ABS_LOW_ACC) {
      const drop = STRESS_ABS_LOW_ACC - recentAcc;
      const detected = drop >= STRESS_ACC_DROP_MODERATE;
      return {
        detected,
        reason: "Most of today's answers were wrong.",
        detail: `Today you got ${Math.round(recentAcc * 100)}% right (${recent.length} questions, no earlier record to compare).`,
        magnitude: detected ? drop : 0,
      };
    }
    return {
      detected: false,
      reason: "Accuracy is steady.",
      detail: `No drop — recent accuracy ${Math.round(recentAcc * 100)}%.`,
      magnitude: 0,
    };
  }

  const drop = baseAcc - recentAcc;
  const detected = drop >= STRESS_ACC_DROP_MODERATE;
  return {
    detected,
    reason: detected ? "You're getting more answers wrong than usual." : "Accuracy is steady.",
    detail: `Recent ${Math.round(recentAcc * 100)}% vs your usual ${Math.round(baseAcc * 100)}% (${recent.length} recent questions).`,
    magnitude: detected ? drop : 0,
  };
}

function assessLatency(recent: StressAttempt[], baseline: StressAttempt[]): SignalEvidence {
  const recentTimes = recent.map((a) => a.time_taken_seconds).filter((t): t is number => t !== null);
  const baseTimes = baseline.map((a) => a.time_taken_seconds).filter((t): t is number => t !== null);
  const recentMean = mean(recentTimes);
  const baseMean = mean(baseTimes);

  if (recentMean === null || recentTimes.length < STRESS_MIN_RECENT) {
    return { detected: false, reason: "Too little timing data yet to judge pace.", detail: "" };
  }
  if (baseMean === null || baseTimes.length < STRESS_MIN_BASELINE) {
    const detected = recentMean >= STRESS_LATENCY_ABS_S;
    return {
      detected,
      reason: detected ? "Questions are taking a very long time." : "Pace looks normal.",
      detail: `Average ${Math.round(recentMean)}s per question (${recentTimes.length} recent questions).`,
      magnitude: detected ? recentMean / STRESS_LATENCY_ABS_S : 0,
    };
  }
  const detected = baseMean >= 8 && recentMean >= baseMean * STRESS_LATENCY_RATIO;
  return {
    detected,
    reason: detected ? "Questions are taking much longer than they used to." : "Pace looks normal.",
    detail: `Average ${Math.round(recentMean)}s now vs your usual ${Math.round(baseMean)}s.`,
    magnitude: detected ? recentMean / baseMean : 0,
  };
}

function assessLateNight(recent: StressAttempt[]): SignalEvidence {
  const hours = recent.map((a) => hourInTz(a.attempted_at));
  const late = hours.filter((h) => isLateNightHour(h)).length;
  const detected = recent.length >= STRESS_LATE_MIN_COUNT && late / recent.length >= STRESS_LATE_SHARE;
  return {
    detected,
    reason: detected ? "A lot of this work happened very late at night." : "Work is happening at reasonable hours.",
    detail: `${late} of ${recent.length} recent questions were answered between 10pm and 5am.`,
  };
}

function assessAbandon(recent: StressAttempt[], nowMs: number): SignalEvidence {
  // Only sessions that have clearly ended count, so we don't flag someone
  // mid-session for not having finished yet.
  const closed = clusterSessions(recent)
    .filter((s) => nowMs - s.endMs > SESSION_CLOSED_AFTER_MIN * 60_000)
    .map((s) => ({
      attempts: s.attempts.length,
      durationMin: (s.endMs - s.startMs) / 60_000,
      wrong: s.attempts.filter((a) => !a.is_correct).length,
    }));

  const abandoned = closed.filter(
    (s) => s.attempts <= SESSION_SHORT_MAX_ATTEMPTS && s.durationMin <= SESSION_MAX_SHORT_MIN && s.wrong > 0
  ).length;
  const detected = abandoned >= 1 && closed.length >= 1 && abandoned / closed.length >= 0.5;
  return {
    detected,
    reason: detected ? "Practice sessions keep stopping right after a wrong answer." : "Sessions run to a natural end.",
    detail: `${abandoned} of ${closed.length} finished sessions ended within minutes, on a wrong answer.`,
  };
}

/* ------------------------- main entry ------------------------- */

export function assessStress(
  allAttempts: StressAttempt[],
  nowIso: string = new Date().toISOString()
): StressAssessment {
  const nowMs = new Date(nowIso).getTime();
  const recent: StressAttempt[] = [];
  const baseline: StressAttempt[] = [];
  for (const a of allAttempts) {
    const ageHours = (nowMs - new Date(a.attempted_at).getTime()) / 3_600_000;
    if (ageHours <= STRESS_RECENT_HOURS && ageHours >= 0) recent.push(a);
    else if (ageHours > STRESS_RECENT_HOURS && ageHours <= STRESS_BASELINE_MAX_HOURS) baseline.push(a);
  }

  const noSignal: StressSignals = {
    accuracy_drop: { detected: false, reason: "Not enough activity to judge stress yet.", detail: "" },
    avg_latency: { detected: false, reason: "Not enough activity to judge stress yet.", detail: "" },
    late_night: { detected: false, reason: "Not enough activity to judge stress yet.", detail: "" },
    abandon_rate: { detected: false, reason: "Not enough activity to judge stress yet.", detail: "" },
  };

  if (recent.length < STRESS_MIN_RECENT) {
    return { score: null, signals: noSignal };
  }

  const signals: StressSignals = {
    accuracy_drop: assessAccuracyDrop(recent, baseline),
    avg_latency: assessLatency(recent, baseline),
    late_night: assessLateNight(recent),
    abandon_rate: assessAbandon(recent, nowMs),
  };

  // Scoring table (each thresholded signal counts once):
  //   0 signals -> low, 1 signal -> medium, 2+ signals -> high.
  // Signals only fire past real thresholds, so a single honest signal is
  // enough to be worth pacing for; a stack of them is a genuinely heavy day.
  const points =
    (signals.accuracy_drop.detected ? 1 : 0) +
    (signals.avg_latency.detected ? 1 : 0) +
    (signals.late_night.detected ? 1 : 0) +
    (signals.abandon_rate.detected ? 1 : 0);

  let score: StressLevel;
  if (points >= 2) score = "high";
  else if (points === 1) score = "medium";
  else score = "low";

  return { score, signals };
}

export function stressLabel(score: StressLevel): string {
  if (score === "high") return "high";
  if (score === "medium") return "medium";
  return "low";
}
