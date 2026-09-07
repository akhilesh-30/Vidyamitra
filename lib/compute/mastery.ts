/**
 * F4 — mastery from the raw `attempts` log.
 *
 * Simple Bayesian knowledge tracing. Each attempt is evidence for or against
 * the student having a topic under control. Evidence is weighted by how
 * recent it is (a 21-day half-life) so old slips fade and recent growth
 * shows up quickly, and the posterior is a Beta distribution updated from a
 * small symmetric prior, which keeps a couple of lucky correct answers from
 * jumping a topic to "mastered".
 *
 *   mastery = alpha / (alpha + beta)
 *   alpha   = prior_a + Σ w_i · correct_i
 *   beta    = prior_b + Σ w_i · (1 − correct_i)
 *   w_i     = 0.5 ^ (age / halfLife)  (plus a small floor so the past isn't deleted)
 *
 * Pure function of real rows only — no fake numbers, ever.
 */

export interface AttemptEvidence {
  is_correct: boolean;
  attempted_at: string; // ISO UTC
}

export interface MasteryResult {
  /** 0.0–1.0 */
  mastery: number;
  /** how much evidence the estimate rests on (0 = none) */
  evidence: number;
  correctWeight: number;
  wrongWeight: number;
}

export const MASTERY_HALF_LIFE_HOURS = 21 * 24; // 21 days
export const MASTERY_MIN_RECENCY_WEIGHT = 0.1;
const PRIOR_A = 1.25;
const PRIOR_B = 1.25;

export function recencyWeight(ageHours: number): number {
  if (ageHours <= 0) return 1;
  const w = Math.pow(0.5, ageHours / MASTERY_HALF_LIFE_HOURS);
  return Math.max(w, MASTERY_MIN_RECENCY_WEIGHT);
}

export function computeTopicMastery(
  attempts: AttemptEvidence[],
  nowIso: string = new Date().toISOString()
): MasteryResult {
  let correctWeight = 0;
  let wrongWeight = 0;

  for (const a of attempts) {
    const ageHours = (new Date(nowIso).getTime() - new Date(a.attempted_at).getTime()) / 3_600_000;
    const w = recencyWeight(ageHours);
    if (a.is_correct) correctWeight += w;
    else wrongWeight += w;
  }

  const evidence = correctWeight + wrongWeight;
  if (evidence <= 0) {
    return { mastery: 0, evidence: 0, correctWeight: 0, wrongWeight: 0 };
  }

  const alpha = PRIOR_A + correctWeight;
  const beta = PRIOR_B + wrongWeight;
  const mastery = alpha / (alpha + beta);

  return { mastery, evidence, correctWeight, wrongWeight };
}

/** Mastery band names used in plain-language UI copy (garden language). */
export type MasteryBand = "new" | "sprouting" | "growing" | "almost" | "mastered";

export function masteryBand(mastery: number | null): MasteryBand {
  if (mastery === null || mastery === undefined) return "new";
  if (mastery < 0.4) return "sprouting";
  if (mastery < 0.7) return "growing";
  if (mastery < 0.85) return "almost";
  return "mastered";
}

export function masteryBandLabel(band: MasteryBand): string {
  switch (band) {
    case "new":
      return "Not started";
    case "sprouting":
      return "Just beginning";
    case "growing":
      return "Getting steadier";
    case "almost":
      return "Nearly there";
    case "mastered":
      return "Mastered";
  }
}

export const WEAK_MASTERY = 0.7; // below this a topic needs active practice
/** a topic is "mastered" only once confidence is high enough for spaced review */
export const MASTERED_MASTERY = 0.85;
