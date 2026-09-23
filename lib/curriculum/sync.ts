import "server-only";
import { getAdmin } from "@/lib/supabase/admin";
import { getSubjects, SUBJECT_LABEL, type BoardId, type SubjectId } from "@/lib/curriculum";

/**
 * Lazy curriculum sync — mirrors the code syllabus into the existing
 * `subjects` / `topics` tables the first time a student touches them, so all
 * the existing attempt/mastery machinery works unchanged. Idempotent.
 */

export interface SyncedTopic {
  dbTopicId: string;
  dbSubjectId: string;
  codeTopicId: string;
  name: string;
}

export interface SyncedSubject {
  dbSubjectId: string;
  subjectId: SubjectId;
}

const syncCache = new Map<string, { subjects: Map<SubjectId, string>; topics: Map<string, string> }>();

/**
 * Ensure subject + topic rows exist for this board/class and return maps:
 *   subjects: "math"|"science" -> uuid
 *   topics:   code topic id    -> uuid
 */
export async function ensureCurriculumSynced(board: BoardId, grade: number): Promise<{
  subjects: Map<SubjectId, string>;
  topics: Map<string, string>;
}> {
  const cacheKey = `${board}:${grade}`;
  const cached = syncCache.get(cacheKey);
  if (cached) return cached;

  const admin = getAdmin();
  const subjects = new Map<SubjectId, string>();
  const topics = new Map<string, string>();

  const { data: existingSubjects } = await admin
    .from("subjects")
    .select("id, name")
    .eq("board", board)
    .eq("class_level", grade);

  const subjectByName = new Map<string, string>();
  for (const s of existingSubjects ?? []) {
    subjectByName.set(String((s as { name: string }).name), String((s as { id: string }).id));
  }

  for (const cur of getSubjects(board, grade)) {
    const label = SUBJECT_LABEL[cur.id];
    let subjectUuid = subjectByName.get(label);
    if (!subjectUuid) {
      const { data, error } = await admin
        .from("subjects")
        .insert({ board, class_level: grade, name: label })
        .select("id")
        .single();
      if (error) throw new Error(`Subject sync failed: ${error.message}`);
      subjectUuid = String((data as { id: string }).id);
    }
    subjects.set(cur.id, subjectUuid);

    // load existing topic names for this subject
    const { data: existingTopics } = await admin
      .from("topics")
      .select("id, name, sequence")
      .eq("subject_id", subjectUuid);
    const topicByName = new Map<string, string>();
    for (const t of existingTopics ?? []) {
      topicByName.set(String((t as { name: string }).name), String((t as { id: string }).id));
    }

    let seq = 0;
    for (const chapter of cur.chapters) {
      for (const [ti, topicName] of chapter.topics.entries()) {
        const codeId = `${chapter.id}-t${ti + 1}`;
        seq += 1;
        let topicUuid = topicByName.get(topicName);
        if (!topicUuid) {
          const { data, error } = await admin
            .from("topics")
            .insert({ subject_id: subjectUuid, name: topicName, sequence: seq })
            .select("id")
            .single();
          if (error) throw new Error(`Topic sync failed (${topicName}): ${error.message}`);
          topicUuid = String((data as { id: string }).id);
        }
        topics.set(codeId, topicUuid);
      }
    }
  }

  const result = { subjects, topics };
  syncCache.set(cacheKey, result);
  return result;
}

/** Fetch mastery rows for every synced topic of this student. */
export async function fetchMasteryFor(
  studentId: string,
  topicUuids: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (topicUuids.length === 0) return out;
  const admin = getAdmin();
  const { data, error } = await admin
    .from("mastery_scores")
    .select("topic_id, mastery")
    .eq("student_id", studentId)
    .in("topic_id", topicUuids);
  if (error) throw new Error(`Mastery fetch failed: ${error.message}`);
  for (const row of (data ?? []) as { topic_id: string; mastery: number }[]) {
    out.set(row.topic_id, row.mastery);
  }
  return out;
}
