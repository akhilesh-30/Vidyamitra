/**
 * End-to-end smoke test against a running dev server.
 *
 *   npm run dev:plain          (in one terminal)
 *   node scripts/smoke.mjs     (in another)
 *
 * Creates a throwaway account, walks signup -> onboarding -> every student API,
 * prints each status, then deletes the account and its database row.
 * Uses .env.local for the Supabase URL and keys. Never prints a key.
 */
process.loadEnvFile?.(".env.local");

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SB || !ANON || !SERVICE) {
  console.error("Missing Supabase env values in .env.local");
  process.exit(1);
}

const stamp = Date.now();
const email = `codebuff.smoke.${stamp}@example.com`;
const password = `Smoke!${stamp}Aa`;

let failures = 0;
const pass = (label, detail = "") => console.log(`  PASS  ${label}${detail ? `  ${detail}` : ""}`);
const fail = (label, detail = "") => {
  failures += 1;
  console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ""}`);
};

function check(label, res, body) {
  const okStatus = res.status >= 200 && res.status < 300;
  const err = body && body.error ? ` code=${body.error.code ?? "-"} msg=${String(body.error.message).slice(0, 110)}` : "";
  if (okStatus) pass(label, `HTTP ${res.status}`);
  else fail(label, `HTTP ${res.status}${err}`);
  return okStatus;
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function api(path, token, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return { res, body: await json(res) };
}

console.log(`Smoke test against ${BASE}\n`);

/* 1. signup ------------------------------------------------------------- */
const signupRes = await fetch(`${SB}/auth/v1/signup`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const signup = await json(signupRes);
const token = signup?.access_token ?? signup?.session?.access_token ?? "";
const userId = signup?.user?.id ?? signup?.id ?? "";

if (token) pass("signup returns a session", `user=${userId ? "created" : "?"}`);
else fail("signup", `HTTP ${signupRes.status} ${JSON.stringify(signup).slice(0, 160)}`);

if (!token || !userId) {
  console.log("\nCannot continue without a session.");
  process.exit(1);
}

/* 2. onboarding --------------------------------------------------------- */
const onb = await api("/api/onboarding", token, {
  method: "POST",
  body: JSON.stringify({ name: "Smoke Test", class_level: 8, board: "CBSE", age: 13, school: "Smoke School" }),
});
check("POST /api/onboarding", onb.res, onb.body);

/* 3. every student surface --------------------------------------------- */
const gets = ["/api/me", "/api/today", "/api/dashboard", "/api/progress", "/api/community", "/api/checkin"];
for (const path of gets) {
  const r = await api(path, token);
  check(`GET ${path}`, r.res, r.body);
}

// Learn also gives us a real topic id for the quiz call below.
const learn = await api("/api/learn", token);
check("GET /api/learn", learn.res, learn.body);

const firstChapter = learn.body?.data?.subjects?.flatMap((s) => s.chapters ?? [])?.[0] ?? null;
const firstTopicId = firstChapter?.topics?.[0]?.id ?? "";
const firstChapterId = firstChapter?.id ?? "";

/* 4. writes ------------------------------------------------------------- */
const ci = await api("/api/checkin", token, {
  method: "POST",
  body: JSON.stringify({ mood_emoji: "\uD83D\uDE10", note: "smoke test check-in" }),
});
check("POST /api/checkin", ci.res, ci.body);

const next = await api("/api/practice/next", token);
if (check("GET /api/practice/next", next.res, next.body)) {
  const payload = next.body?.data;
  const kind = payload?.question_id ? "question" : payload?.done ? "done" : payload?.status ?? "unknown";
  console.log(`        practice payload: ${kind}`);
}

if (firstTopicId) {
  const q = await api("/api/quiz", token, {
    method: "POST",
    body: JSON.stringify({ action: "generate", topicId: firstTopicId, count: 2 }),
  });
  const count = q.body?.data?.questions?.length ?? 0;
  if (q.res.ok && count > 0) pass("POST /api/quiz (Groq)", `HTTP ${q.res.status}, ${count} questions`);
  else if (q.res.ok) fail("POST /api/quiz (Groq)", `HTTP ${q.res.status} but 0 questions`);
  else
    fail(
      "POST /api/quiz (Groq)",
      `HTTP ${q.res.status} ${q.body?.error?.message?.slice(0, 120) ?? ""}`
    );
} else {
  fail("POST /api/quiz (Groq)", "/api/learn returned no topics to quiz on");
}

/* exam notes (Groq) */
if (firstChapterId) {
  const exam = await api("/api/exam", token, {
    method: "POST",
    body: JSON.stringify({ action: "notes", chapterId: firstChapterId }),
  });
  const points = exam.body?.data?.points?.length ?? 0;
  const formulas = exam.body?.data?.formulas?.length ?? 0;
  if (exam.res.ok && points > 0) pass("POST /api/exam notes (Groq)", `${points} points, ${formulas} formulas`);
  else fail("POST /api/exam notes (Groq)", `HTTP ${exam.res.status} ${exam.body?.error?.message?.slice(0, 120) ?? ""}`);
} else {
  fail("POST /api/exam notes (Groq)", "no chapterId from /api/learn");
}

/* Chat: the page reads this stream verbatim, so assert the wire contract. */
try {
  const res = await fetch(`${BASE}/api/mitra`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "In one short sentence, what is 2 + 2?", history: [] }),
  });
  const text = await res.text();
  const ctype = res.headers.get("content-type") ?? "";
  const clean = text.replace(/data:\s*/g, "").replace(/\[DONE\]/g, "").trim();

  if (!res.ok) fail("POST /api/mitra (stream)", `HTTP ${res.status} ${text.slice(0, 120)}`);
  else if (text.includes("[object Object]"))
    fail("POST /api/mitra (stream)", "reply contains [object Object]");
  else if (clean.length === 0) fail("POST /api/mitra (stream)", "empty reply");
  else {
    pass("POST /api/mitra (stream)", `${ctype.split(";")[0]}, ${clean.length} chars`);
    console.log(`        reply: ${clean.replace(/\s+/g, " ").slice(0, 80)}…`);
  }
} catch (e) {
  fail("POST /api/mitra (stream)", e.message);
}

/* Signed-out requests must carry a readable message, not an object the client
   would stringify into [object Object]. */
try {
  const res = await fetch(`${BASE}/api/mitra`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello", history: [] }),
  });
  const raw = await res.text();
  let message = "Something went wrong. Please try again in a moment.";
  try {
    const parsed = JSON.parse(raw);
    const err = parsed?.error;
    if (typeof err === "string") message = err;
    else if (err && typeof err === "object" && typeof err.message === "string") message = err.message;
  } catch {
    if (raw.trim()) message = raw.trim().slice(0, 200);
  }
  const isReadable = message !== "[object Object]" && message.length > 5;
  if (res.status === 401 && isReadable) pass("signed-out chat is refused readably", `${res.status}: "${message.slice(0, 60)}"`);
  else fail("signed-out chat is refused readably", `HTTP ${res.status}, message "${message}"`);
} catch (e) {
  fail("signed-out chat is refused readably", e.message);
}

/* 5. cleanup ------------------------------------------------------------ */
const studentId = onb.body?.data?.student?.id ?? "";

if (SERVICE) {
  const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "return=minimal" };
  const del = (table, filter) =>
    fetch(`${SB}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: svc });

  if (studentId) {
    // Children first: these rows reference students, so deleting the student
    // alone fails with a foreign-key conflict (HTTP 409).
    const order = ["escalations", "attempts", "mastery_scores", "stress_logs", "checkins"];
    const results = [];
    for (const t of order) {
      const r = await del(t, `student_id=eq.${studentId}`);
      if (!r.ok) results.push(`${t}:${r.status}`);
    }
    const rowRes = await del("students", `id=eq.${studentId}`);
    if (!rowRes.ok) results.push(`students:${rowRes.status}`);
    console.log(
      `\ncleanup: rows ${results.length === 0 ? "deleted" : `issues ${results.join(" ")}`}`
    );
  } else {
    await del("students", `auth_user_id=eq.${userId}`);
    console.log("\ncleanup: student row removed by auth_user_id (no id in response)");
  }

  const delUser = await fetch(`${SB}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (delUser.ok) console.log("cleanup: auth user deleted");
  else console.log(`cleanup: auth user HTTP ${delUser.status} ${(await delUser.text()).slice(0, 120)}`);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
