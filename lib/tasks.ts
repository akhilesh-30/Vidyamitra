import { masteryBand } from "@/lib/compute/mastery";

/**
 * Daily task generation — deterministic per (student, date) so refreshes don't
 * shuffle the list mid-day. Blends study tasks (weakest topics first) with
 * wellness tasks shaped by the day's mood/stress so the plan serves the
 * whole student, not just the syllabus.
 */

export interface TaskInput {
  dateKey: string; // YYYY-MM-DD (IST) — deterministic seed
  moodToday: number | null; // 1..5 (5 = great)
  stress: "low" | "medium" | "high" | null;
  weakTopics: { name: string; chapter: string; mastery: number | null }[];
  nextTopics: { name: string; chapter: string }[];
}

export interface DailyTask {
  id: string;
  kind: "study" | "wellness" | "fun";
  title: string;
  detail: string;
  minutes: number;
}

/** Deterministic 0..1 from a string seed. */
function seededRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[Math.floor(seededRand(seed) * arr.length) % arr.length];
}

const WELLNESS_LOW = [
  { title: "Box breathing reset", detail: "4 counts in, hold 4, out 4, hold 4 — five rounds. Find it in Mind Gym → Breathe.", minutes: 3 },
  { title: "Step outside for sunlight", detail: "5 minutes of open sky. Your nervous system resets faster with real light.", minutes: 5 },
  { title: "Write one worry down", detail: "Put it in your check-in note. Naming a worry makes it smaller than carrying it.", minutes: 3 },
  { title: "Talk to someone you trust", detail: "One honest sentence about today to a friend, parent, or Lily Ai counts.", minutes: 5 },
];

const WELLNESS_OK = [
  { title: "Hydration check", detail: "Your brain is ~75% water. Grab a glass before the next study block.", minutes: 2 },
  { title: "Stretch & shake it out", detail: "Roll shoulders, touch your toes, shake your hands for 30 seconds each.", minutes: 4 },
  { title: "Gratitude note", detail: "Write one thing that went right today in your check-in note.", minutes: 3 },
  { title: "Tidy your desk for 2 minutes", detail: "A clear space quietly lowers background stress.", minutes: 2 },
];

const WELLNESS_GREAT = [
  { title: "Try a mind game", detail: "You're in a good state — challenge Memory Match or Worry Pop in Mind Gym.", minutes: 5 },
  { title: "Teach-back moment", detail: "Explain today's best concept out loud as if teaching a friend. Great days are for locking learning in.", minutes: 5 },
  { title: "Help a classmate", detail: "Answer one doubt in the Unburden space — teaching is the deepest revision.", minutes: 5 },
];

const FUN_TASKS = [
  { title: "Worry Pop", detail: "Pop 30 bubbles and leave the day's noise with them. Mind Gym.", minutes: 4 },
  { title: "Memory Match", detail: "One calm round of Memory Match. Mind Gym.", minutes: 5 },
];

export function generateDailyTasks(input: TaskInput): DailyTask[] {
  const seed = input.dateKey;
  const tasks: DailyTask[] = [];
  const mood = input.moodToday ?? 3;
  const stressed = input.stress === "high" || input.stress === "medium" || mood <= 2;

  // 1–2 study tasks from the weakest / next topics (quota shrinks when stressed).
  const studyCount = input.stress === "high" ? 1 : mood <= 2 ? 1 : 2;
  const studyPool = [...input.weakTopics, ...input.nextTopics.map((t) => ({ ...t, mastery: null }))];
  const seen = new Set<string>();
  for (const t of studyPool) {
    if (tasks.filter((x) => x.kind === "study").length >= studyCount) break;
    const key = `${t.chapter}::${t.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const band = masteryBand(t.mastery);
    const isWeak = t.mastery !== null && t.mastery < 0.7;
    tasks.push({
      kind: "study",
      id: `study:${key}`,
      title: isWeak ? `Revive: ${t.name}` : `Explore: ${t.name}`,
      detail: `${t.chapter} · ${band === "new" ? "fresh start" : `${Math.round((t.mastery ?? 0) * 100)}% so far`} — one lesson + a 5-question quiz is plenty for today.`,
      minutes: 15,
    });
  }

  // 1 wellness task matched to the day.
  const wellnessPool = mood <= 2 ? WELLNESS_LOW : mood >= 4 ? WELLNESS_GREAT : WELLNESS_OK;
  const w = pick(wellnessPool, seed + ":w");
  tasks.push({ kind: "wellness", id: `wellness:${w.title}`, title: w.title, detail: w.detail, minutes: w.minutes });

  // 1 fun task, always — joy is part of the plan.
  if (!stressed) {
    const f = pick(FUN_TASKS, seed + ":f");
    tasks.push({ kind: "fun", id: `fun:${f.title}`, title: f.title, detail: f.detail, minutes: f.minutes });
  }

  return tasks;
}

export function dateKeyIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return ist.toISOString().slice(0, 10);
}
