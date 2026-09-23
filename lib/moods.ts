/**
 * The five check-in faces, kept as \u escapes on purpose: emoji typed literally
 * into source have been getting mangled by editors/tooling, and the server
 * (see app/api/today) matches these exact code points when scoring a day.
 */

export interface MoodFace {
  emoji: string;
  label: string;
  /** 1 = worst, 5 = best. Mirrors moodScore() in app/api/today/route.ts */
  score: number;
}

export const MOOD_FACES: MoodFace[] = [
  { emoji: "\uD83D\uDE2D", label: "Awful", score: 1 },
  { emoji: "\uD83D\uDE1E", label: "Low", score: 2 },
  { emoji: "\uD83D\uDE10", label: "Okay", score: 3 },
  { emoji: "\uD83D\uDE42", label: "Good", score: 4 },
  { emoji: "\uD83D\uDE04", label: "Great", score: 5 },
];

export function moodLabel(emoji: string | null | undefined): string {
  if (!emoji) return "Not logged";
  return MOOD_FACES.find((m) => m.emoji === emoji)?.label ?? "Logged";
}

export function moodScore(emoji: string | null | undefined): number | null {
  if (!emoji) return null;
  return MOOD_FACES.find((m) => m.emoji === emoji)?.score ?? null;
}

/** A short, kind sentence for a mood score — used in analysis copy. */
export function moodNote(score: number | null): string {
  if (score === null) return "No check-ins in this window yet.";
  if (score <= 2) return "Several heavy days. Today's plan is deliberately lighter.";
  if (score === 3) return "Steady, middle-of-the-road days. Good ground to build on.";
  return "Mostly good days — a strong stretch to push a little further.";
}
