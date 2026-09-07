import { test } from "node:test";
import assert from "node:assert/strict";

import { computeTopicMastery, recencyWeight, masteryBand } from "../lib/compute/mastery";
import { assessStress, clusterSessions } from "../lib/compute/stress";
import { buildAdaptivePlan } from "../lib/compute/adaptive";
import { evaluateCheckin, normalizeText } from "../lib/flagging";

const NOW = "2026-09-05T10:00:00.000Z"; // 15:30 IST, a reasonable study hour

function hoursBefore(h: number): string {
  return new Date(new Date(NOW).getTime() - h * 3_600_000).toISOString();
}

/* ---------------- F4: mastery from real attempts ---------------- */

test("mastery: repeated recent correct answers grow mastery", () => {
  const attempts = [
    { is_correct: true, attempted_at: hoursBefore(1) },
    { is_correct: true, attempted_at: hoursBefore(2) },
    { is_correct: true, attempted_at: hoursBefore(3) },
    { is_correct: true, attempted_at: hoursBefore(4) },
    { is_correct: true, attempted_at: hoursBefore(5) },
    { is_correct: true, attempted_at: hoursBefore(6) },
    { is_correct: true, attempted_at: hoursBefore(26) },
  ];
  const { mastery } = computeTopicMastery(attempts, NOW);
  assert.ok(mastery > 0.8, `expected strong mastery, got ${mastery}`);
  assert.ok(mastery < 1, "never reaches a perfect 1.0 from evidence");
});

test("mastery: wrong answers pull the score down", () => {
  const wrong = computeTopicMastery(
    [1, 2, 3, 4].map((h) => ({ is_correct: false, attempted_at: hoursBefore(h) })),
    NOW
  );
  assert.ok(wrong.mastery < 0.35, `expected low mastery, got ${wrong.mastery}`);
});

test("mastery: recent evidence counts more than old evidence", () => {
  const old = computeTopicMastery(
    [30, 40].map((h) => ({ is_correct: true, attempted_at: hoursBefore(h) })),
    NOW
  );
  const fresh = computeTopicMastery(
    [1, 2].map((h) => ({ is_correct: true, attempted_at: hoursBefore(h) })),
    NOW
  );
  assert.ok(fresh.mastery > old.mastery, "same answers, fresher evidence should win");
  assert.ok(recencyWeight(0.5) > recencyWeight(50));
});

test("mastery: empty history is zero, bands make sense", () => {
  assert.equal(computeTopicMastery([], NOW).mastery, 0);
  assert.equal(masteryBand(null), "new");
  assert.equal(masteryBand(0.5), "growing");
  assert.equal(masteryBand(0.9), "mastered");
});

/* ---------------- F5: stress from real attempt behaviour ---------------- */

const goodBaseline = Array.from({ length: 8 }, (_, i) => ({
  is_correct: true,
  time_taken_seconds: 20,
  attempted_at: hoursBefore(50 + i), // ~2-3 days ago, daytime-ish UTC=evening IST? keep simple
}));

test("stress: accuracy collapse plus slow answers reads high", () => {
  const recent = Array.from({ length: 5 }, (_, i) => ({
    is_correct: false,
    time_taken_seconds: 90,
    attempted_at: hoursBefore(1 + i * 0.1),
  }));
  const a = assessStress([...goodBaseline, ...recent], NOW);
  assert.equal(a.score, "high");
  assert.equal(a.signals.accuracy_drop.detected, true);
  assert.equal(a.signals.avg_latency.detected, true);
  assert.ok(a.signals.accuracy_drop.reason.length > 10, "reason is explainable");
});

test("stress: a normal good session reads low", () => {
  const recent = Array.from({ length: 5 }, (_, i) => ({
    is_correct: true,
    time_taken_seconds: 20,
    attempted_at: hoursBefore(1 + i * 0.1),
  }));
  const a = assessStress([...goodBaseline, ...recent], NOW);
  assert.equal(a.score, "low");
  assert.equal(a.signals.accuracy_drop.detected, false);
  assert.equal(a.signals.avg_latency.detected, false);
});

test("stress: late-night work is its own medium signal", () => {
  // 2026-09-04T19:00:00Z is 00:30 IST on 5 Sep — after midnight.
  const late = Array.from({ length: 4 }, () => ({
    is_correct: true,
    time_taken_seconds: 20,
    attempted_at: "2026-09-04T19:10:00.000Z",
  }));
  const a = assessStress([...goodBaseline, ...late], NOW);
  assert.equal(a.signals.late_night.detected, true);
  assert.equal(a.score, "medium");
});

test("stress: not enough recent behaviour -> no claim at all", () => {
  const two = [
    { is_correct: true, time_taken_seconds: 10, attempted_at: hoursBefore(1) },
    { is_correct: false, time_taken_seconds: 12, attempted_at: hoursBefore(2) },
  ];
  const a = assessStress([...goodBaseline, ...two], NOW);
  assert.equal(a.score, null);
});

test("stress: short sessions ending wrong are abandonment", () => {
  // a closed short session 2h ago: 2 attempts, wrong answer, 2 min long
  const twoH = 2;
  const closedShort = [
    { is_correct: false, time_taken_seconds: 20, attempted_at: hoursBefore(twoH) },
    { is_correct: false, time_taken_seconds: 20, attempted_at: hoursBefore(twoH - 2 / 60) },
  ];
  const recent = Array.from({ length: 4 }, (_, i) => ({
    is_correct: true,
    time_taken_seconds: 20,
    attempted_at: hoursBefore(1 + i * 0.05),
  }));
  const a = assessStress([...closedShort, ...recent], NOW);
  assert.equal(a.signals.abandon_rate.detected, true);
  assert.equal(clusterSessions(recent).length, 1);
});

/* ---------------- F6: adaptive pacing ---------------- */

function topic(id: string, sequence: number, name: string) {
  return { topic: { id, sequence, name }, mastery: null as number | null, updated_at: null as string | null };
}

test("pacing: weakest-first queue with untouched chapters next", () => {
  const states = [
    { ...topic("a", 1, "Rational Numbers"), mastery: 0.9, updated_at: hoursBefore(20 * 24) }, // review due (14d+)
    { ...topic("b", 2, "Linear Equations"), mastery: 0.3, updated_at: hoursBefore(5) }, // weak
    { ...topic("c", 3, "Quadrilaterals") }, // new
    { ...topic("d", 4, "Data Handling"), mastery: 0.9, updated_at: hoursBefore(3) }, // resting
  ];
  const plan = buildAdaptivePlan(states, null, NOW);
  assert.equal(plan.quota, 12);
  assert.deepEqual(
    plan.queue.map((q) => q.topic_id),
    ["b", "c", "a"]
  );
  assert.deepEqual(plan.skipped, []);
});

test("pacing: first-session quota is gentle, high stress shrinks and postpones", () => {
  const fresh = [topic("a", 1, "One"), topic("b", 2, "Two")];
  const first = buildAdaptivePlan(fresh, null, NOW);
  assert.equal(first.quota, 8, "gentle start before there is stress history");

  const stressed = buildAdaptivePlan(
    [
      { ...topic("a", 1, "One"), mastery: 0.3, updated_at: hoursBefore(5) },
      { ...topic("b", 2, "Two"), mastery: 0.9, updated_at: hoursBefore(20 * 24) },
      { ...topic("c", 3, "Three") },
    ],
    "high",
    NOW
  );
  assert.equal(stressed.quota, 5);
  // review postponed and the newest unstarted chapter postponed
  assert.ok(stressed.skipped.some((s) => s.topic_id === "b"));
  assert.ok(stressed.skipped.some((s) => s.topic_id === "c"));
  assert.deepEqual(
    stressed.queue.map((q) => q.topic_id),
    ["a"]
  );
});

test("pacing: mastered topic rests until its review interval", () => {
  const states = [{ ...topic("a", 1, "One"), mastery: 0.92, updated_at: hoursBefore(10 * 24) }];
  const plan = buildAdaptivePlan(states, "low", NOW);
  assert.equal(plan.queue.length, 0, "10 days old at 0.92 needs 14 days before review");
});

/* ---------------- F7: check-in flagging ---------------- */

test("flagging: serious phrases always escalate", () => {
  const v = evaluateCheckin("I don't want to live anymore", "😭", 0);
  assert.equal(v.flagged, true);
  assert.ok(v.reason!.includes("dont want to live"));
});

test("flagging: concern plus a low emoji escalates, plain bad day does not", () => {
  const heavy = evaluateCheckin("everything is too much right now", "😢", 0);
  assert.equal(heavy.flagged, true);
  const plain = evaluateCheckin("got a bad mark in hindi today", "🙁", 0);
  assert.equal(plain.flagged, false);
  const noEmoji = evaluateCheckin("everything is too much right now", "🙂", 0);
  assert.equal(noEmoji.flagged, false, "words alone at moderate level + neutral mood = no flag");
});

test("flagging: repeated low check-ins trend escalates without words", () => {
  const v = evaluateCheckin("", "😞", 2);
  assert.equal(v.flagged, true);
  assert.ok(v.reason!.includes("check-ins"));
});

test("flagging: normalization keeps apostrophes out of the way", () => {
  assert.ok(normalizeText("I can't take it anymore!").includes("cant take it anymore"));
  const v = evaluateCheckin("I can't take it anymore", "💔", 0);
  assert.equal(v.flagged, true);
});
