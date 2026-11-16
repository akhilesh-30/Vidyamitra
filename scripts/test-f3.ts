/**
 * F3 live verification — practice & attempt logging against the LIVE DB.
 *
 * Plays a real session through the app's HTTP routes with the E2E student:
 *   GET  /api/practice/next?exclude=…   serves a real seeded question
 *   POST /api/practice/submit           records the answer
 * and after every submit independently reads `attempts` back (service role)
 * to confirm the row was really written with the correct is_correct and
 * time_taken_seconds. Mixes correct and incorrect answers on purpose.
 *
 *   BASE_URL=http://localhost:3210 npx tsx scripts/test-f3.ts
 */
import { createClient } from "@supabase/supabase-js";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "vidyamitra-e2e-student@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Vidyamitra-E2E-2026!";
const BASE_URL = process.env.BASE_URL!;
const SESSION_LENGTH = 6;

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

interface NextQuestion {
  question_id: string;
  topic_id: string;
  topic_name: string;
  question_text: string;
  options: { key: string; text: string }[];
  index: number;
  quota: number;
}
interface SubmitResult {
  correct: boolean;
  correct_key: string;
  correct_text: string;
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !svcKey) throw new Error("Missing Supabase env vars");
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "pkce" },
  });
  const svc = createClient(url, svcKey, { auth: { persistSession: false } });

  // ---- ensure E2E student exists, signed in, onboarded ----------------
  const found = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!found.data.users.some((u) => u.email === E2E_EMAIL)) {
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

  const onboardRes = await fetch(`${BASE_URL}/api/onboarding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Test Student", class_level: 8, board: "CBSE" }),
  });
  const onboard = await onboardRes.json().catch(() => null);
  const studentId = onboard?.data?.student?.id as string | undefined;
  if (!studentId) throw new Error(`Onboarding failed: HTTP ${onboardRes.status} ${JSON.stringify(onboard)}`);

  const attemptsBefore = await svc
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  const beforeCount = attemptsBefore.count ?? 0;

  console.log(`E2E student ${studentId} · attempts before session: ${beforeCount}\n`);

  const exclude: string[] = [];
  let served = 0;
  const firstRaw: { question: NextQuestion | null; submit: SubmitResult | null } = { question: null, submit: null };

  for (let i = 0; i < SESSION_LENGTH; i++) {
    // ---- serve next question ------------------------------------------
    const excludeParam = exclude.length ? `?exclude=${exclude.join(",")}` : "";
    const nextRes = await fetch(`${BASE_URL}/api/practice/next${excludeParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const next = (await nextRes.json().catch(() => null))?.data as NextQuestion | { status: string } | null;
    if (nextRes.status !== 200 || !next || !("question_id" in next)) {
      check(`q${i + 1}: /api/practice/next served a question`, false, `HTTP ${nextRes.status} ${JSON.stringify(next)}`);
      break;
    }
    const q = next as NextQuestion;
    served++;
    exclude.push(q.question_id);

    // ---- decide an answer (answer key read server-side) ----------------
    const { data: qRow } = await svc
      .from("questions")
      .select("correct_option")
      .eq("id", q.question_id)
      .maybeSingle();
    const correctKey = (qRow as { correct_option: string } | null)?.correct_option ?? "a";
    const wrongKey = q.options.find((o) => o.key !== correctKey)?.key ?? "a";
    const selectedKey = i % 2 === 0 ? correctKey : wrongKey; // alternate right/wrong
    const expectCorrect = selectedKey === correctKey;
    const timeTaken = 8 + i * 7; // realistic variety, seconds

    const submitRes = await fetch(`${BASE_URL}/api/practice/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: q.question_id, selected_key: selectedKey, time_taken_seconds: timeTaken }),
    });
    const submit = (await submitRes.json().catch(() => null))?.data as SubmitResult | null;
    check(
      `q${i + 1}: submit recorded (${expectCorrect ? "correct" : "wrong"}, ${timeTaken}s)`,
      submitRes.status === 200 && submit?.correct === expectCorrect,
      submitRes.status !== 200
        ? `HTTP ${submitRes.status} ${JSON.stringify(submit)}`
        : `correct=${submit?.correct} (expected ${expectCorrect}) key=${submit?.correct_key}`
    );
    if (!firstRaw.question && q) firstRaw.question = q;
    if (!firstRaw.submit) firstRaw.submit = submit;

    // ---- independent read-back of the attempt row ---------------------
    const { data: row } = await svc
      .from("attempts")
      .select("id, student_id, question_id, is_correct, time_taken_seconds, attempted_at")
      .eq("student_id", studentId)
      .eq("question_id", q.question_id)
      .order("attempted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const a = row as {
      id: string;
      student_id: string;
      question_id: string;
      is_correct: boolean;
      time_taken_seconds: number;
      attempted_at: string;
    } | null;
    check(
      `q${i + 1}: attempts row written & matches`,
      Boolean(a) &&
        a!.student_id === studentId &&
        a!.question_id === q.question_id &&
        a!.is_correct === expectCorrect &&
        a!.time_taken_seconds === timeTaken,
      a
        ? `attempt ${a.id} is_correct=${a.is_correct} time=${a.time_taken_seconds}s at ${a.attempted_at}`
        : "no row found"
    );
  }

  // ---- totals ----------------------------------------------------------
  const attemptsAfter = await svc
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  const afterCount = attemptsAfter.count ?? 0;
  check(
    "attempts table grew by exactly the session length",
    served === SESSION_LENGTH && afterCount - beforeCount === SESSION_LENGTH,
    `before=${beforeCount} after=${afterCount} delta=${afterCount - beforeCount} (served=${served})`
  );

  if (firstRaw.question && firstRaw.submit) {
    console.log("\nRAW — first question served and its submit response:");
    console.log(
      JSON.stringify(
        {
          served: {
            topic: firstRaw.question.topic_name,
            index: firstRaw.question.index,
            quota: firstRaw.question.quota,
            question_text: firstRaw.question.question_text.slice(0, 120),
            options: firstRaw.question.options,
          },
          submitted: firstRaw.submit,
        },
        null,
        2
      )
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? "\nF3 live verification: all checks passed." : `\n${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("F3 live verification crashed:", e.message ?? e);
  process.exit(1);
});
