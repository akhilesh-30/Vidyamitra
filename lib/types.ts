/**
 * Row shapes mirror the PRD schema exactly — no invented or altered tables.
 * Only columns that exist in the PRD SQL are typed here.
 */

export type Board = "CBSE" | "MAHARASHTRA";
export type StressLevel = "low" | "medium" | "high";
export type ContentType = "pdf" | "youtube";
export type EscalationStatus = "open" | "reviewed" | "closed";

export interface StudentRow {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  class_level: number;
  board: Board;
  created_at: string;
}

export interface SubjectRow {
  id: string;
  board: Board;
  class_level: number;
  name: string;
}

export interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
  sequence: number | null;
}

export interface ContentLinkRow {
  id: string;
  topic_id: string;
  type: ContentType;
  title: string | null;
  url: string;
}

export interface QuestionRow {
  id: string;
  topic_id: string;
  question_text: string;
  /** array of option strings, e.g. ["7/3", "3/7", "1/3", "-3/7"] */
  options: unknown;
  /** letter key into the options array, e.g. "b" */
  correct_option: string;
  difficulty: number;
}

export interface AttemptRow {
  id: string;
  student_id: string;
  question_id: string;
  is_correct: boolean | null;
  time_taken_seconds: number | null;
  attempted_at: string;
}

export interface MasteryScoreRow {
  id: string;
  student_id: string;
  topic_id: string;
  mastery: number;
  updated_at: string;
}

/** signals column shape documented in the schema comment:
 *  {accuracy_drop, avg_latency, late_night, abandon_rate} */
export type StressSignals = {
  accuracy_drop: SignalEvidence;
  avg_latency: SignalEvidence;
  late_night: SignalEvidence;
  abandon_rate: SignalEvidence;
};

/** Human-explainable evidence for one stress signal. */
export interface SignalEvidence {
  detected: boolean;
  reason: string;
  detail?: string;
}

export interface StressLogRow {
  id: string;
  student_id: string;
  stress_score: StressLevel;
  signals: StressSignals;
  logged_at: string;
}

export interface CheckinRow {
  id: string;
  student_id: string;
  mood_emoji: string | null;
  note: string | null;
  flagged: boolean;
  created_at: string;
}

export interface EscalationRow {
  id: string;
  student_id: string;
  checkin_id: string | null;
  reason: string;
  status: EscalationStatus;
  created_at: string;
}

/* ---------- Joined shapes the API returns ---------- */

export interface TopicWithContent {
  topic: TopicRow;
  mastery: number | null; // null = never attempted / no score row yet
  updated_at: string | null;
  contentLinks: Pick<ContentLinkRow, "id" | "type" | "title" | "url">[];
}

export interface MasteryUpdate {
  topic_id: string;
  topic_name: string;
  mastery: number;
}

export interface AdaptiveQueueItem {
  topic_id: string;
  name: string;
  kind: "new" | "weak" | "review";
  mastery: number | null;
  days_since: number;
}

export interface AdaptivePlan {
  quota: number; // how many questions this student should answer today
  quotaReason: string; // plain-language why
  queue: AdaptiveQueueItem[];
  skipped: { topic_id: string; name: string; reason: string }[];
}

export interface PracticeQuestion {
  question_id: string;
  topic_id: string;
  topic_name: string;
  question_text: string;
  /** labelled options, each { key: "a"|"b"|..., text } */
  options: { key: string; text: string }[];
  index: number; // 1-based within the session
  quota: number;
  correct_so_far: number;
  total_so_far: number;
}

export interface StressResult {
  score: StressLevel;
  signals: StressSignals;
}

export interface EscalationWithStudent extends EscalationRow {
  auth_user_id: string | null;
  student_name: string | null;
  class_level: number;
  board: Board;
  checkin_note: string | null;
  checkin_emoji: string | null;
}
