/**
 * Curriculum types — the code-first syllabus engine.
 *
 * Chapters/topics live in code (fast to edit, no DB dependency to browse),
 * and get lazily synced into the existing Supabase `subjects` / `topics`
 * tables the first time a student opens them, so all the existing
 * attempts / mastery / stress machinery keeps working unchanged.
 */

export type BoardId = "CBSE" | "MAHARASHTRA";
export type SubjectId = "math" | "science";

export interface Chapter {
  /** stable code id, e.g. "CBSE-10-math-05" */
  id: string;
  no: number;
  name: string;
  topics: string[];
  /** formula sheet for exam mode */
  formulas?: string[];
  /** fallback revision bullets when AI is unavailable */
  revision?: string[];
}

export interface SubjectCurriculum {
  id: SubjectId;
  name: string;
  chapters: Chapter[];
}

export const BOARD_LABEL: Record<BoardId, string> = {
  CBSE: "CBSE",
  MAHARASHTRA: "Maharashtra State Board",
};

export const SUBJECT_LABEL: Record<SubjectId, string> = {
  math: "Mathematics",
  science: "Science",
};

export function chapterId(board: BoardId, grade: number, subject: SubjectId, no: number): string {
  return `${board}-${grade}-${subject}-${String(no).padStart(2, "0")}`;
}

export function topicId(board: BoardId, grade: number, subject: SubjectId, no: number, topicIdx: number): string {
  return `${chapterId(board, grade, subject, no)}-t${topicIdx + 1}`;
}

/** Reliable, never-dead YouTube link: a focused search for the exact lesson. */
export function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function chapterYt(board: BoardId, grade: number, subjectLabel: string, chapterName: string): string {
  const boardTag = board === "CBSE" ? "CBSE" : "Maharashtra board";
  return youtubeSearch(`${chapterName} class ${grade} ${subjectLabel} ${boardTag} full chapter explanation`);
}

export function topicYt(board: BoardId, grade: number, subjectLabel: string, chapterName: string, topic: string): string {
  const boardTag = board === "CBSE" ? "CBSE" : "Maharashtra board";
  return youtubeSearch(`${topic} class ${grade} ${subjectLabel} ${boardTag} ${chapterName}`);
}

/** Small builder to keep the syllabus data readable. */
export function ch(
  board: BoardId,
  grade: number,
  subject: SubjectId,
  no: number,
  name: string,
  topics: string[],
  extra?: { formulas?: string[]; revision?: string[] }
): Chapter {
  return { id: chapterId(board, grade, subject, no), no, name, topics, ...extra };
}
