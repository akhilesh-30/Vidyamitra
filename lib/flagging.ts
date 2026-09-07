/**
 * F7 — post-session check-ins are screened by simple keyword rules only.
 * Vidyamitra never counsels the student itself: a flag only means "a human
 * should look at this", and the reason column records exactly which phrase
 * triggered it so the counsellor has context.
 */

/** Emojis that read as clearly low. */
export const SAD_EMOJIS = ["😭", "😢", "💔", "😞", "😔", "😟", "🥀"];

/**
 * Phrases that always warrant a human look. Keep the list narrow and
 * unambiguous — we want few false alarms on things a 13-year-old says in
 * normal bad days, and we never want to miss the serious ones.
 */
export const SERIOUS_PHRASES: string[] = [
  "kill myself",
  "killing myself",
  "kill me",
  "suicide",
  "end my life",
  "end it all",
  "want to die",
  "wanna die",
  "want to be dead",
  "wish i was dead",
  "dont want to live",
  "no point living",
  "better off without me",
  "better off dead",
  "no reason to live",
  "hurt myself",
  "harm myself",
  "self harm",
  "cut myself",
  "cutting myself",
  "hate myself",
  "hate my life",
  "worthless",
  "no one cares",
  "nobody cares",
  "everyone hates me",
  "give up on life",
  "give up on everything",
  "go on",
  "done with everything",
  "take it anymore",
  "do this anymore",
];

/** Heavy-but-not-urgent language; combined with a low emoji it flags too. */
export const CONCERN_PHRASES: string[] = [
  "too much to handle",
  "everything is too much",
  "all too much",
  "always crying",
  "crying every day",
  "crying everyday",
  "i give up",
  "im giving up",
  "so stressed",
  "so much pressure",
  "cant sleep",
  "no friends",
  "dont want to go to school",
  "hate school",
  "scared of exams",
  "scared of the exam",
  "afraid of failing",
  "hopeless",
];

export interface FlagVerdict {
  flagged: boolean;
  /** which phrase matched (first serious or concern match) */
  matched?: string;
  /** human-readable reason stored in escalations.reason */
  reason?: string;
}

export function normalizeText(note: string): string {
  return note
    .toLowerCase()
    .replace(/['’‘]/g, "") // “don’t” -> “dont” so keyword lists stay simple
    .replace(/[.,!?;:"()\[\]{}–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateCheckin(
  noteRaw: string | null,
  emoji: string | null,
  prevLowDays: number
): FlagVerdict {
  const note = noteRaw ? normalizeText(noteRaw) : "";
  const moodLow = emoji !== null && SAD_EMOJIS.includes(emoji);

  const serious = SERIOUS_PHRASES.find((p) => note.includes(p));
  if (serious) {
    return {
      flagged: true,
      matched: serious,
      reason: `Note mentioned "${serious}". This is flagged for a counsellor to follow up — the student is not in trouble.`,
    };
  }

  const concern = note ? CONCERN_PHRASES.find((p) => note.includes(p)) : undefined;
  if (concern && moodLow) {
    return {
      flagged: true,
      matched: concern,
      reason: `Note mentioned "${concern}" while the mood check-in was low. Flagged for a counsellor to check in.`,
    };
  }

  // A run of several low check-ins in a few days is worth a look even
  // without alarming words — it's a trend, not one bad evening.
  if (moodLow && prevLowDays >= 2) {
    return {
      flagged: true,
      reason: `${prevLowDays + 1} low mood check-ins in the last few days. Flagged so a counsellor can check in — no specific words triggered this.`,
    };
  }

  return { flagged: false };
}
