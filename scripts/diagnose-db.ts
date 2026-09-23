import { createClient } from "@supabase/supabase-js";
function loadEnv() {
  for (const f of [".env.local", ".env"]) { try { process.loadEnvFile(f); return; } catch {} }
}
async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env vars");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: subjects } = await sb.from("subjects").select("id,board,class_level,name");
  console.log("\n=== subjects (" + (subjects?.length ?? 0) + " rows) ===");
  (subjects ?? []).forEach(s => console.log("  board=" + s.board + " class=" + s.class_level + " name=" + s.name));
  if (!subjects?.length) console.log("  EMPTY — seed never ran");

  const { count: topicCount } = await sb.from("topics").select("id", { count: "exact", head: true });
  console.log("\n=== topics: " + (topicCount ?? 0) + " total rows ===");

  const { count: clCount } = await sb.from("content_links").select("id", { count: "exact", head: true });
  console.log("=== content_links: " + (clCount ?? 0) + " total rows ===");

  const { count: qCount } = await sb.from("questions").select("id", { count: "exact", head: true });
  console.log("=== questions: " + (qCount ?? 0) + " total rows ===");

  const { data: amans } = await sb.from("students").select("id,name,board,class_level").ilike("name", "%aman%");
  console.log("\n=== students matching 'aman' (" + (amans?.length ?? 0) + ") ===");
  (amans ?? []).forEach(s => console.log("  name=" + s.name + " board=" + s.board + " class=" + s.class_level));
  if (!amans?.length) {
    const { data: all } = await sb.from("students").select("id,name,board,class_level").limit(10);
    console.log("  (not found by name — all students up to 10:)");
    (all ?? []).forEach(s => console.log("    name=" + s.name + " board=" + s.board + " class=" + s.class_level));
  }

  console.log("\n=== MISMATCH CHECK ===");
  const seedBoard = "CBSE"; const seedClass = 8;
  const all_students = [...(amans ?? [])];
  if (!subjects?.length) {
    console.log("ISSUE: No seeded subjects — run npm run seed");
  } else {
    (all_students).forEach(s => {
      if (s.board !== seedBoard || s.class_level !== seedClass) {
        console.log("MISMATCH: " + s.name + " is board=" + s.board + " class=" + s.class_level + " but seed covers CBSE class 8");
      } else {
        console.log("OK: " + s.name + " matches seeded content (CBSE class 8)");
      }
    });
  }
}
main().catch(e => { console.error(e?.message ?? e); process.exit(1); });
