"use client";

/* v0-styled dashboard — same data contract as components/student/dashboard-view
   (/api/dashboard: syllabus, plan, latestStress). The v0 shell provides the
   dark look; all numbers below come from real Supabase rows. */

import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Leaf, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AdaptivePlan, StressLevel, TopicWithContent } from "@/lib/types";

interface SubjectSyllabus {
  subject: { id: string; name: string; board: string; class_level: number };
  topics: TopicWithContent[];
}

export interface DashboardData {
  student: { name: string | null; class_level: number; board: string };
  syllabus: SubjectSyllabus[];
  plan: AdaptivePlan & { pendingSyllabus: number };
  latestStress: {
    stress_score: StressLevel;
    logged_at: string;
    signals: Record<string, { detected: boolean; reason: string; detail?: string }>;
  } | null;
}

const TONES = ["ember", "sage", "sand"] as const;

function masteryWord(m: number | null): string {
  if (m === null) return "not started";
  if (m >= 0.85) return "mastered — review scheduled";
  if (m >= 0.7) return "nearly there";
  if (m >= 0.4) return "getting steadier";
  return "just beginning";
}

export function V0Dashboard({
  data,
  onBreak,
}: {
  data: DashboardData;
  onBreak: () => void;
}) {
  const router = useRouter();
  const topics = data.syllabus.flatMap((s) =>
    s.topics.map((t) => ({ ...t, subject: s.subject.name }))
  );
  const started = topics.filter((t) => t.mastery !== null);
  const focusTopic = data.plan.queue[0];
  const highStress = data.latestStress?.stress_score === "high";
  const greetingName = data.student.name?.split(" ")[0] ?? "there";

  return (
    <motion.main className="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="dashboard-top">
        <div>
          <p className="eyebrow">
            Class {data.student.class_level} · {data.student.board} <span className="eyebrow-dot" />
          </p>
          <h2>
            Good to see you, <em>{greetingName}.</em>
          </h2>
          <p className="muted">
            {highStress
              ? "Today reads heavy — the plan below is smaller on purpose."
              : "Let's pick up where your curiosity left off."}
          </p>
        </div>
        <div className="streak">
          <span>TODAY'S PLAN</span>
          <strong>{data.plan.quota} <small>questions</small></strong>
          <p className="muted" style={{ fontSize: 11, maxWidth: 150 }}>{data.plan.quotaReason}</p>
        </div>
      </div>

      <section className="focus-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">YOUR LEARNING FIELD</span>
            <h3>
              Where your attention is <em>growing</em>
            </h3>
          </div>
          <button className="icon-button" aria-label="Open progress view" onClick={() => router.push("/progress")}>
            <ArrowUpRight />
          </button>
        </div>
        <div className="field-grid">
          <div className="constellation-wrap">
            <div className="constellation-center">
              {started.length > 0 ? (
                <>
                  {started.length} of {topics.length} chapters<br />
                  <strong>taking root</strong>
                </>
              ) : (
                <>
                  {topics.length} chapters waiting<br />
                  <strong>begin anywhere</strong>
                </>
              )}
            </div>
            <p className="field-note">
              <Sparkles /> {focusTopic
                ? `Next up: ${focusTopic.name} — ${focusTopic.kind === "weak" ? "this one needs work" : focusTopic.kind === "new" ? "a fresh chapter" : "time to revisit"}.`
                : "Everything you've covered is steady. Come back tomorrow."}
            </p>
          </div>
          <div className="subject-list">
            {topics.slice(0, 6).map((t, index) => (
              <button
                className={`subject subject-${TONES[index % TONES.length]}`}
                key={t.topic.id}
                onClick={() => router.push("/practice")}
              >
                <span className="subject-index">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{t.topic.name}</strong>
                  <small>{t.subject}</small>
                </span>
                <span className="subject-note">{masteryWord(t.mastery)}</span>
                <ChevronRight />
              </button>
            ))}
            {topics.length > 6 ? (
              <button className="break-link" onClick={() => router.push("/dashboard")}>
                …{topics.length - 6} more chapters on your home page
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="wellness">
        <div className="wellness-copy">
          <span className="section-kicker">A SMALL CHECK-IN</span>
          <h3>
            How is your mind
            <br />
            <em>feeling today?</em>
          </h3>
          <p>There is no right answer. This helps shape the space around you.</p>
        </div>
        <div className="wellness-actions">
          <button className="feeling" onClick={() => router.push("/checkin")}>
            <span className="feeling-icon">◌</span>Say how I feel
          </button>
          <button className="feeling" onClick={() => router.push("/checkin")}>
            <span className="feeling-icon">∿</span>After a session
          </button>
          {highStress ? (
            <button className="break-link" onClick={onBreak}>
              <Leaf /> The plan is light today — take the pause <ArrowUpRight />
            </button>
          ) : (
            <button className="break-link" onClick={() => router.push("/checkin")}>
              <Leaf /> A pause is always allowed <ArrowUpRight />
            </button>
          )}
        </div>
      </section>
    </motion.main>
  );
}
