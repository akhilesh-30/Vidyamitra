/**
 * F2 live verification — content aggregation against the LIVE database.
 *
 * Requires the Next dev server (BASE_URL). Ensures the E2E student exists,
 * drives onboarding through the real /api/onboarding route, then fetches
 * /api/dashboard and asserts the seeded Class 8 · CBSE · Mathematics
 * syllabus: 13 chapters, each with a PDF + YouTube link, and that a sample
 * of those links is actually reachable.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f2.ts
 */
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "vidyamitra-e2e-student@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Vidyamitra-E2E-2026!";
const BASE_URL = process.env.BASE_URL;

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

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n       ${detail}`);
};

interface TopicItem {
  topic: { id: string; name: string; sequence: number | null };
  mastery: number | null;
  updated_at: string | null;
  contentLinks: { id: string; type: string; title: string | null; url: string }[];
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !svcKey) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
  }
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
  });
  const svc = createClient(url, svcKey, { auth: { persistSession: false } });

  // ---- ensure the E2E student exists and is signed in -----------------
  const found = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = found.data.users.find((u) => u.email === E2E_EMAIL);
  if (!existing) {
    const { error } = await svc.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Could not create E2E user: ${error.message}`);
  }
  const si = await anon.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });
  if (si.error) throw new Error(`Sign-in failed: ${si.error.message}`);
  const token = si.data.session!.access_token;

  // ---- independent row counts straight from the DB (service role) -----
  const count = async (table: string, filter?: Record<string, unknown>) => {
    let q = svc.from(table).select("id", { count: "exact", head: true });
    for (const [k, v] of Object.entries(filter ?? {})) q = q.eq(k as never, v as never);
    const { count: c, error } = await q;
    return error ? -1 : (c ?? -1);
  };
  const subjCount = await count("subjects", { board: "CBSE", class_level: 8 });
  const topicCount = await count("topics");
  const linkCount = await count("content_links");
  const questionCount = await count("questions");
  check(
    "db: seeded rows exist (service role counts)",
    subjCount === 1 && topicCount === 13 && linkCount === 26 && questionCount === 52,
    `subjects=${subjCount} topics=${topicCount} content_links=${linkCount} questions=${questionCount}`
  );

  // ---- onboarding via the real route (idempotent) ---------------------
  const onboardRes = await fetch(`${BASE_URL}/api/onboarding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Test Student", class_level: 8, board: "CBSE" }),
  });
  const onboard = await onboardRes.json().catch(() => null);
  const student = onboard?.data?.student;
  check(
    "f2: student row ready via /api/onboarding",
    onboardRes.status === 200 && student?.class_level === 8 && student?.board === "CBSE",
    `HTTP ${onboardRes.status}${student ? `, student ${student.id}` : `, ${JSON.stringify(onboard)}`}`
  );

  // ---- dashboard ------------------------------------------------------
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dash = await dashRes.json().catch(() => null);
  const syllabus: { subject: { id: string; name: string }; topics: TopicItem[] }[] =
    dash?.data?.syllabus ?? [];
  const math = syllabus.find((s) => s.subject.name === "Mathematics");
  const allTopics: TopicItem[] = (math?.topics ?? []) as TopicItem[];
  const pdfs = allTopics.flatMap((t) => t.contentLinks.filter((l) => l.type === "pdf"));
  const yts = allTopics.flatMap((t) => t.contentLinks.filter((l) => l.type === "youtube"));

  check(
    "f2: dashboard serves the Mathematics syllabus",
    dashRes.status === 200 && Boolean(math) && allTopics.length === 13,
    `HTTP ${dashRes.status}, subjects=${syllabus.length}, mathematics topics=${allTopics.length}`
  );
  check(
    "f2: every chapter has a PDF and a YouTube link",
    allTopics.length === 13 &&
      allTopics.every((t) => t.contentLinks.some((l) => l.type === "pdf")) &&
      allTopics.every((t) => t.contentLinks.some((l) => l.type === "youtube")),
    `content_links total=${pdfs.length + yts.length} (pdf=${pdfs.length}, youtube=${yts.length})`
  );
  check(
    "f2: plan present (quota + queue)",
    typeof dash?.data?.plan?.quota === "number" && Array.isArray(dash?.data?.plan?.queue),
    `quota=${dash?.data?.plan?.quota}, queue=${dash?.data?.plan?.queue?.length} due topic(s), pending syllabus=${dash?.data?.plan?.pendingSyllabus}`
  );

  // ---- raw sample: first chapter with its real links ------------------
  if (allTopics.length > 0) {
    const first = allTopics[0];
    console.log("\nRAW — first chapter served by /api/dashboard:");
    console.log(
      JSON.stringify(
        {
          chapter: first.topic.name,
          mastery: first.mastery,
          contentLinks: first.contentLinks,
        },
        null,
        2
      )
    );

    // reachability of a sample of real links (server-side)
    for (const link of first.contentLinks.slice(0, 2)) {
      let lastErr = "";
      let ok = false;
      let status = 0;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          const r = await fetch(link.url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
          ok = r.ok || r.status === 403;
          status = r.status;
        } catch (e) {
          lastErr = (e as Error).message;
          await new Promise((res) => setTimeout(res, 1500));
        }
      }
      check(
        `link reachable: ${link.type} (${link.url.slice(0, 70)}…)`,
        ok,
        ok ? `HTTP ${status}` : `fetch failed twice: ${lastErr}`
      );
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF2 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F2 live verification crashed:", e.message ?? e);
  process.exit(1);
});
