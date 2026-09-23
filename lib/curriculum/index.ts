import { CBSE_MATH } from "./cbse-math";
import { CBSE_SCIENCE } from "./cbse-science";
import { MH_MATH } from "./mh-math";
import { MH_SCIENCE } from "./mh-science";
import { chapterYt, topicYt, type BoardId, type Chapter, type SubjectCurriculum, type SubjectId } from "./types";

export * from "./types";

/** CURRICULUM[board][grade] -> subjects (grades 5–10). */
export const CURRICULUM: Record<BoardId, Record<number, SubjectCurriculum[]>> = {
  CBSE: {
    5: [CBSE_MATH, CBSE_SCIENCE],
    6: [CBSE_MATH, CBSE_SCIENCE],
    7: [CBSE_MATH, CBSE_SCIENCE],
    8: [CBSE_MATH, CBSE_SCIENCE],
    9: [CBSE_MATH, CBSE_SCIENCE],
    10: [CBSE_MATH, CBSE_SCIENCE],
  },
  MAHARASHTRA: {
    5: [MH_MATH, MH_SCIENCE],
    6: [MH_MATH, MH_SCIENCE],
    7: [MH_MATH, MH_SCIENCE],
    8: [MH_MATH, MH_SCIENCE],
    9: [MH_MATH, MH_SCIENCE],
    10: [MH_MATH, MH_SCIENCE],
  },
};

export const MIN_GRADE = 5;
export const MAX_GRADE = 10;

export function isBoard(v: unknown): v is BoardId {
  return v === "CBSE" || v === "MAHARASHTRA";
}

export function isSubjectId(v: unknown): v is SubjectId {
  return v === "math" || v === "science";
}

export function getSubjects(board: BoardId, grade: number): SubjectCurriculum[] {
  return CURRICULUM[board]?.[grade] ?? [];
}

export function getSubject(board: BoardId, grade: number, subjectId: SubjectId): SubjectCurriculum | null {
  return getSubjects(board, grade).find((s) => s.id === subjectId) ?? null;
}

export function findChapter(board: BoardId, grade: number, subjectId: SubjectId, chapterId: string): Chapter | null {
  return getSubject(board, grade, subjectId)?.chapters.find((c) => c.id === chapterId) ?? null;
}

export interface ResolvedTopic {
  board: BoardId;
  grade: number;
  subjectId: SubjectId;
  subjectName: string;
  chapter: Chapter;
  topicIndex: number;
  topicName: string;
  yt: string;
}

/** Resolve a code topic id like "CBSE-10-math-08-t3" back to its full context. */
export function resolveTopicId(codeId: string): ResolvedTopic | null {
  const parts = codeId.split("-");
  // BOARD-GRADE-SUBJ-NN-tN  => 5 parts
  if (parts.length !== 5 || !parts[4].startsWith("t")) return null;
  const board = parts[0] as BoardId;
  const grade = Number(parts[1]);
  const subjectId = parts[2] as SubjectId;
  if (!isBoard(board) || !isSubjectId(subjectId) || Number.isNaN(grade)) return null;
  const chapter = findChapter(board, grade, subjectId, `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`);
  if (!chapter) return null;
  const i = Number(parts[4].slice(1)) - 1;
  if (Number.isNaN(i) || i < 0 || i >= chapter.topics.length) return null;
  const subjectName = getSubject(board, grade, subjectId)?.name ?? subjectId;
  return {
    board,
    grade,
    subjectId,
    subjectName,
    chapter,
    topicIndex: i,
    topicName: chapter.topics[i],
    yt: topicYt(board, grade, subjectName, chapter.name, chapter.topics[i]),
  };
}

/** Human label helper for AI prompts & UI. */
export function chapterYtFor(board: BoardId, grade: number, subjectId: SubjectId, chapter: Chapter): string {
  const subjectName = getSubject(board, grade, subjectId)?.name ?? subjectId;
  return chapterYt(board, grade, subjectName, chapter.name);
}

export function totalTopicCount(board: BoardId, grade: number): number {
  return getSubjects(board, grade).reduce(
    (acc, s) => acc + s.chapters.reduce((a, c) => a + c.topics.length, 0),
    0
  );
}
