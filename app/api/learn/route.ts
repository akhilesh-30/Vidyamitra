import { handleApiError, ok, requireStudent } from "@/lib/api/server";
import { ensureCurriculumSynced, fetchMasteryFor } from "@/lib/curriculum/sync";
import { chapterYtFor, getSubjects, SUBJECT_LABEL, topicYt, type BoardId, type SubjectId } from "@/lib/curriculum";
import type { StudentRow } from "@/lib/types";

export const runtime = "nodejs";

export interface LearnTopic {
  id: string;
  index: number;
  name: string;
  mastery: number | null;
  yt: string;
}

export interface LearnChapter {
  id: string;
  no: number;
  name: string;
  yt: string;
  progress: number; // 0..1 average mastery (null -> 0)
  mastered: number;
  total: number;
  topics: LearnTopic[];
}

export interface LearnSubject {
  id: SubjectId;
  name: string;
  progress: number;
  mastered: number;
  total: number;
  chapters: LearnChapter[];
}

/**
 * The full syllabus for the signed-in student's board & class, with live
 * mastery percentages. Syncs the code curriculum into Supabase lazily.
 */
export async function GET(req: Request): Promise<Response> {
  try {
    const { student } = await requireStudent(req);
    const board = student.board as BoardId;
    const grade = student.class_level;

    const { subjects: subjectMap, topics: topicMap } = await ensureCurriculumSynced(board, grade);
    const mastery = await fetchMasteryFor(student.id, [...topicMap.values()]);
    const dbToCode = new Map([...topicMap.entries()].map(([code, uuid]) => [uuid, code]));

    const subjects: LearnSubject[] = getSubjects(board, grade).map((cur) => {
      const dbSubjectId = subjectMap.get(cur.id)!;
      const chapters: LearnChapter[] = cur.chapters.map((chapter) => {
        const topics: LearnTopic[] = chapter.topics.map((name, i) => {
          const codeId = `${chapter.id}-t${i + 1}`;
          const uuid = topicMap.get(codeId)!;
          return {
            id: codeId,
            index: i,
            name,
            mastery: mastery.get(uuid) ?? null,
            yt: topicYt(board, grade, SUBJECT_LABEL[cur.id], chapter.name, name),
          };
        });
        const total = topics.length;
        const sum = topics.reduce((acc, t) => acc + (t.mastery ?? 0), 0);
        return {
          id: chapter.id,
          no: chapter.no,
          name: chapter.name,
          yt: chapterYtFor(board, grade, cur.id, chapter),
          progress: total ? sum / total : 0,
          mastered: topics.filter((t) => (t.mastery ?? 0) >= 0.85).length,
          total,
          topics,
        };
      });
      const total = chapters.reduce((a, c) => a + c.total, 0);
      const sum = chapters.reduce((a, c) => a + c.progress * c.total, 0);
      const mastered = chapters.reduce((a, c) => a + c.mastered, 0);
      return {
        id: cur.id,
        name: cur.name,
        progress: total ? sum / total : 0,
        mastered,
        total,
        chapters,
      };
    });

    return ok({ student, subjects });
  } catch (e) {
    return handleApiError(e);
  }
}
