/**
 * Seed runner — F2 content aggregation.
 *
 * Populates subjects / topics / content_links / questions for one board,
 * one class, one subject (Class 8 · CBSE · Mathematics). Safe to run more
 * than once: chapters, links and questions already present are left alone.
 *
 * Usage:
 *   npm run seed            # add anything missing
 *   npm run seed:clear      # remove ONLY the seeded subject (refuses if
 *                           # students have attempts against its questions)
 *
 * Needs Supabase env vars (reads .env.local, then .env).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUBJECT_SEED, TOPIC_SEEDS, buildPdfLink, buildYouTubeLink } from "./seed-data";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      /* try the next one */
    }
  }
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env.local / .env`);
  return v;
}

type Letter = "a" | "b" | "c" | "d";

async function main(): Promise<void> {
  loadEnv();
  const clear = process.argv.includes("--clear");
  const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- locate or create the subject ----
  const { data: existingSubject } = await sb
    .from("subjects")
    .select("*")
    .eq("board", SUBJECT_SEED.board)
    .eq("class_level", SUBJECT_SEED.class_level)
    .eq("name", SUBJECT_SEED.name)
    .maybeSingle();

  let subjectId: string;
  if (existingSubject) {
    subjectId = existingSubject.id as string;
  } else {
    const { data, error } = await sb
      .from("subjects")
      .insert(SUBJECT_SEED)
      .select("id")
      .single();
    if (error) throw new Error(`Could not create subject: ${error.message}`);
    subjectId = data.id as string;
  }

  if (clear) {
    await clearSeededSubject(sb, subjectId);
    return;
  }

  // ---- topics / content links / questions ----
  let topicsCreated = 0;
  let linksCreated = 0;
  let questionsCreated = 0;

  for (const seed of TOPIC_SEEDS) {
    const { data: existing } = await sb
      .from("topics")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("name", seed.name)
      .maybeSingle();

    let topicId: string;
    if (existing) {
      topicId = existing.id as string;
    } else {
      const { data, error } = await sb
        .from("topics")
        .insert({ subject_id: subjectId, name: seed.name, sequence: seed.sequence })
        .select("id")
        .single();
      if (error) throw new Error(`Could not create topic ${seed.name}: ${error.message}`);
      topicId = data.id as string;
      topicsCreated++;
    }

    // content links
    const pdf = buildPdfLink(seed.name, seed.pdfUrl);
    const yt = buildYouTubeLink(seed.name);
    for (const link of [pdf, yt]) {
      const { data: hasLink } = await sb
        .from("content_links")
        .select("id")
        .eq("topic_id", topicId)
        .eq("type", link === pdf ? "pdf" : "youtube")
        .maybeSingle();
      if (!hasLink) {
        const { error } = await sb.from("content_links").insert({
          topic_id: topicId,
          type: link === pdf ? "pdf" : "youtube",
          title: link.title,
          url: link.url,
        });
        if (error) throw new Error(`Could not create content link for ${seed.name}: ${error.message}`);
        linksCreated++;
      }
    }

    // questions — only when the topic has none yet (keeps re-runs idempotent)
    const { data: questionCount } = await sb
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", topicId);
    if ((questionCount ?? []).length === 0) {
      for (const q of seed.questions) {
        const { error } = await sb.from("questions").insert({
          topic_id: topicId,
          question_text: q.question_text,
          options: q.options,
          correct_option: q.correct as Letter,
          difficulty: q.difficulty,
        });
        if (error) throw new Error(`Could not create question in ${seed.name}: ${error.message}`);
        questionsCreated++;
      }
    }
  }

  const { count } = await sb
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId);
  const { count: qTotal } = await sb
    .from("questions")
    .select("id", { count: "exact", head: true })
    .in(
      "topic_id",
      ((await sb.from("topics").select("id").eq("subject_id", subjectId)).data ?? []).map((t) => t.id as string)
    );

  console.log(`Seeded “${SUBJECT_SEED.name}” · Class ${SUBJECT_SEED.class_level} · ${SUBJECT_SEED.board}`);
  console.log(`  topics created: ${topicsCreated} (${count} total in subject)`);
  console.log(`  content links created: ${linksCreated}`);
  console.log(`  questions created: ${questionsCreated} (${qTotal} total in subject)`);
}

async function clearSeededSubject(
  sb: SupabaseClient<any, any, any, any, any>,
  subjectId: string
): Promise<void> {
  const { data: topics } = await sb.from("topics").select("id").eq("subject_id", subjectId);
  const topicIds = (topics ?? []).map((t) => t.id as string);
  const { data: questions } = topicIds.length
    ? await sb.from("questions").select("id").in("topic_id", topicIds)
    : { data: [] };
  const questionIds = (questions ?? []).map((q) => q.id as string);

  if (questionIds.length) {
    const { data: attemptHit } = await sb
      .from("attempts")
      .select("id")
      .in("question_id", questionIds)
      .limit(1);
    if ((attemptHit ?? []).length > 0) {
      console.error(
        "Refusing to clear: students have practice attempts against this subject's questions.\n" +
          "Deleting would destroy real attempt history. Use a fresh database instead."
      );
      process.exit(1);
    }
  }

  if (topicIds.length) {
    await sb.from("content_links").delete().in("topic_id", topicIds);
    await sb.from("questions").delete().in("topic_id", topicIds);
  }
  await sb.from("topics").delete().eq("subject_id", subjectId);
  const { error } = await sb.from("subjects").delete().eq("id", subjectId);
  if (error) throw new Error(`Could not clear subject: ${error.message}`);
  console.log("Cleared seeded subject (no attempts were touched).");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
