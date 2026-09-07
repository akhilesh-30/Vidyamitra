/**
 * F6 — adaptive pacing. Pure planner that turns real mastery + stress state
 * into a concrete, explainable daily plan:
 *
 *  • quota — questions today, shrunk when stress is up
 *  • practiceQueue — which topics to work on, weakest first
 *  • skipped — topics postponed because the student is carrying a lot today
 *
 * No new tables are needed: spaced-review timing lives in mastery_scores
 * (mastery + updated_at), stress state lives in stress_logs, syllabus order
 * lives in topics.sequence.
 */

import { MASTERED_MASTERY, WEAK_MASTERY } from "@/lib/compute/mastery";
import type { StressLevel } from "@/lib/types";

export interface PlanTopicRef {
  id: string;
  name: string;
  sequence: number;
}

export interface TopicState {
  topic: PlanTopicRef;
  /** null = never attempted (no mastery_scores row yet) */
  mastery: number | null;
  updated_at: string | null;
}

export type QueueKind = "new" | "weak" | "review";

export interface QueueItem {
  topic_id: string;
  name: string;
  kind: QueueKind;
  mastery: number | null;
  /** for review items: days since it was last practised */
  days_since: number;
}

export interface AdaptivePlan {
  quota: number;
  quotaReason: string;
  queue: QueueItem[];
  skipped: { topic_id: string; name: string; reason: string }[];
}

export const QUOTA_DEFAULT = 12;
export const QUOTA_FIRST_SESSIONS = 8; // until we have real stress history
export const QUOTA_STRESS_MEDIUM = 8;
export const QUOTA_STRESS_HIGH = 5;

const DAY_MS = 24 * 3_600_000;

export function stressToQuota(stress: StressLevel | null, hasHistory: boolean): { quota: number; reason: string } {
  if (stress === "high") {
    return {
      quota: QUOTA_STRESS_HIGH,
      reason: "You're clearly stretched today, so today is a light day — a few questions, then rest.",
    };
  }
  if (stress === "medium") {
    return {
      quota: QUOTA_STRESS_MEDIUM,
      reason: "Today feels heavier than usual, so we trimmed the plan a little.",
    };
  }
  if (!hasHistory) {
    return {
      quota: QUOTA_FIRST_SESSIONS,
      reason: "You're just getting started — short, kind sessions first. This grows as you find your pace.",
    };
  }
  return {
    quota: QUOTA_DEFAULT,
    reason: "A steady day's practice — sized so it fits around school, not on top of it.",
  };
}

/** Days between reviews once a topic is strong, by how strong it is. */
export function reviewIntervalDays(mastery: number): number {
  if (mastery >= 0.95) return 21;
  if (mastery >= 0.9) return 14;
  if (mastery >= MASTERED_MASTERY) return 10;
  if (mastery >= 0.7) return 7;
  return 0; // still needs active practice
}

function classify(state: TopicState, nowIso: string): QueueKind {
  const m = state.mastery;
  if (m === null) return "new";
  if (m < WEAK_MASTERY) return "weak";
  void nowIso;
  return "review";
}

export function buildAdaptivePlan(
  states: TopicState[],
  stress: StressLevel | null,
  nowIso: string = new Date().toISOString()
): AdaptivePlan {
  const hasHistory = states.some((s) => s.mastery !== null);
  const { quota, reason } = stressToQuota(stress, hasHistory);

  const ordered = [...states].sort((a, b) => a.topic.sequence - b.topic.sequence);

  const weak: TopicState[] = [];
  const fresh: TopicState[] = [];
  const dueReview: TopicState[] = [];

  for (const s of ordered) {
    const kind = classify(s, nowIso);
    if (kind === "weak") weak.push(s);
    else if (kind === "new") fresh.push(s);
    else {
      const m = s.mastery ?? 0;
      const interval = reviewIntervalDays(m);
      const daysSince = s.updated_at ? (new Date(nowIso).getTime() - new Date(s.updated_at).getTime()) / DAY_MS : 0;
      if (m >= WEAK_MASTERY && interval > 0 && daysSince >= interval) dueReview.push(s);
    }
  }

  // Weakest first (lowest mastery), then untouched chapters in syllabus order,
  // then spaced review that has come due.
  weak.sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0));
  const queue: QueueItem[] = [
    ...weak.map((s) => ({ topic_id: s.topic.id, name: s.topic.name, kind: "weak" as QueueKind, mastery: s.mastery, days_since: 0 })),
    ...fresh.map((s) => ({ topic_id: s.topic.id, name: s.topic.name, kind: "new" as QueueKind, mastery: null, days_since: 0 })),
    ...dueReview.map((s) => {
      const days = s.updated_at ? Math.max(0, Math.floor((new Date(nowIso).getTime() - new Date(s.updated_at).getTime()) / DAY_MS)) : 0;
      return { topic_id: s.topic.id, name: s.topic.name, kind: "review" as QueueKind, mastery: s.mastery, days_since: days };
    }),
  ];

  const skipped: AdaptivePlan["skipped"] = [];

  if (stress === "high") {
    // Reschedule: drop spaced review for the day and postpone the farthest
    // unstarted chapter. The student keeps working on what's already in
    // their head rather than stacking more new content on a heavy day.
    const idx = queue.findIndex((q) => q.kind === "review");
    if (idx >= 0) {
      const [r] = queue.splice(idx, 1);
      skipped.push({ topic_id: r.topic_id, name: r.name, reason: "Spaced review skipped today — it can wait a day." });
    }
    const freshIdx = queue.findIndex((q) => q.kind === "new");
    if (freshIdx >= 0 && queue.length > 1) {
      // postpone the newest (last-in-sequence) fresh topic
      const newOnes = queue.filter((q) => q.kind === "new");
      const last = newOnes[newOnes.length - 1];
      if (last) {
        const li = queue.findIndex((q) => q.topic_id === last.topic_id);
        const [r] = queue.splice(li, 1);
        skipped.push({ topic_id: r.topic_id, name: r.name, reason: "Postponed — you're carrying a lot today. This chapter can wait for a clearer day." });
      }
    }
  }

  return { quota, quotaReason: reason, queue, skipped };
}

/** True when the latest stress log is high (used to gate the break screen). */
export function isHighStress(stress: StressLevel | null): boolean {
  return stress === "high";
}
