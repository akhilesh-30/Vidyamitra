"use client";

/* Practice — the adaptive daily session. Serves one question at a time from
   /api/practice/next (plan queue, difficulty fit, spacing), scores it on the
   server, and finishes with /api/practice/finish so mastery + stress refresh. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Loader2, RefreshCw, Sparkles, Trophy, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Bar, ErrorNote, SectionHeading, Spinner } from "@/components/ui";

interface Option {
  key: string;
  text: string;
}

interface PracticeQuestion {
  question_id: string;
  topic_id: string;
  topic_name: string;
  question_text: string;
  options: Option[];
  index: number;
  quota: number;
  correct_so_far: number;
  total_so_far: number;
}

interface SubmitResult {
  correct: boolean;
  correct_key: string;
  correct_text: string;
}

interface FinishResult {
  masteryUpdates: { topic_id: string; topic_name: string; mastery: number }[];
  stress: { score: string } | null;
  plan: { quota: number; quotaReason: string };
}

type NextPayload = PracticeQuestion | { done: true; doneReason: string } | { status: "empty" } | null;

function isQuestion(p: NextPayload): p is PracticeQuestion {
  return Boolean(p && typeof p === "object" && "question_id" in (p as Record<string, unknown>));
}

export default function PracticePage() {
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneReason, setDoneReason] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinishResult | null>(null);

  const seen = useRef<string[]>([]);
  const askedAt = useRef<number>(Date.now());
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      setSummary(await apiFetch<FinishResult>("/api/practice/finish", { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't wrap up this session. Your answers are still saved.");
    }
  }, []);

  const loadNext = useCallback(
    async (exclude: string[]) => {
      setLoading(true);
      setError(null);
      setResult(null);
      setChosen(null);
      try {
        const payload = await apiFetch<NextPayload>(
          `/api/practice/next${exclude.length ? `?exclude=${encodeURIComponent(exclude.join(","))}` : ""}`
        );
        if (isQuestion(payload)) {
          setDoneReason(null);
          setQuestion(payload);
          askedAt.current = Date.now();
        } else {
          setQuestion(null);
          setDoneReason(
            payload && "done" in payload
              ? payload.doneReason
              : "No practice questions are ready for your topics yet. Open Learn and take a short quiz first — those questions feed this session."
          );
          await finish();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't get your next question. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [finish]
  );

  useEffect(() => {
    void loadNext([]);
  }, [loadNext]);

  async function submit(key: string) {
    if (!question || chosen || busy) return;
    setChosen(key);
    setBusy(true);
    setError(null);
    const seconds = Math.max(1, Math.round((Date.now() - askedAt.current) / 1000));
    try {
      const res = await apiFetch<SubmitResult>("/api/practice/submit", {
        method: "POST",
        body: { question_id: question.question_id, selected_key: key, time_taken_seconds: seconds },
      });
      setResult(res);
      setAnswered((n) => n + 1);
      if (res.correct) setCorrect((n) => n + 1);
    } catch (e) {
      setChosen(null);
      setError(e instanceof Error ? e.message : "That answer didn't save. Try once more.");
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    if (!question) return;
    seen.current = [...seen.current, question.question_id];
    void loadNext(seen.current);
  }

  async function endSession() {
    setQuestion(null);
    await finish();
  }

  function restart() {
    seen.current = [];
    finishedRef.current = false;
    setSummary(null);
    setAnswered(0);
    setCorrect(0);
    setDoneReason(null);
    void loadNext([]);
  }

  /* ---------- session summary (only once something was answered) ---------- */
  if (summary && answered > 0) {
    const pct = answered ? Math.round((correct / answered) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl">
        <section className="card p-6 text-center fade-up sm:p-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(143,185,150,0.14)] text-[var(--sage)]">
            <Trophy size={22} />
          </span>
          <h1 className="text-2xl font-semibold">
            {answered === 0 ? "Session closed gently." : pct >= 70 ? "That was steady work." : "Good that you showed up."}
          </h1>
          <p className="muted mx-auto mt-2 max-w-md text-[14px] leading-relaxed">
            {summary.plan.quotaReason || `Today's plan is ${summary.plan.quota} questions.`}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--line)] p-3">
              <p className="display text-[24px] font-semibold">{correct}/{answered}</p>
              <p className="faint text-[11.5px]">correct</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <p className="display text-[24px] font-semibold">{pct}%</p>
              <p className="faint text-[11.5px]">accuracy</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <p className="display text-[24px] font-semibold">{summary.masteryUpdates.length}</p>
              <p className="faint text-[11.5px]">topics updated</p>
            </div>
          </div>

          {summary.masteryUpdates.length > 0 ? (
            <ul className="mt-6 space-y-2.5 text-left">
              {summary.masteryUpdates.slice(0, 5).map((u) => (
                <li key={u.topic_id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px]">{u.topic_name}</span>
                    <span className="faint shrink-0 text-[12px]">{Math.round(u.mastery * 100)}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Bar value={u.mastery} tone={u.mastery >= 0.85 ? "sage" : u.mastery >= 0.5 ? "ember" : "rose"} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <button type="button" className="btn btn-ghost" onClick={restart}>
              <RefreshCw size={15} /> Practise again
            </button>
            <Link href="/progress" className="btn btn-primary">
              See progress <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  /* ---------- no questions / finished ---------- */
  if (!question) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SectionHeading title="Practice" hint="Adaptive questions, picked to fit where you are." />
        {loading ? (
          <Spinner label="Choosing your next question…" />
        ) : error ? (
          <ErrorNote message={error} onRetry={() => void loadNext(seen.current)} />
        ) : (
          <section className="card p-6 text-center fade-up">
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(240,178,90,0.12)] text-[var(--ember)]">
              <Sparkles size={19} />
            </span>
            <p className="text-[15px] font-semibold">Nothing queued right now</p>
            <p className="muted mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed">
              {doneReason ?? "This session is wrapped up. Nothing else is queued right now."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Link href="/learn" className="btn btn-primary btn-sm">Open Learn</Link>
              <Link href="/exam" className="btn btn-ghost btn-sm">Exam mode</Link>
            </div>
          </section>
        )}
      </div>
    );
  }

  /* ---------- question ---------- */
  const answeredNow = chosen !== null && result !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SectionHeading
        title="Practice"
        hint={`${question.topic_name} · question ${seen.current.length + 1} of about ${question.quota} today`}
        right={
          <span className="chip chip-ember">
            <Sparkles size={13} /> {correct}/{answered} so far
          </span>
        }
      />

      <Bar value={question.quota ? Math.min(1, seen.current.length / question.quota) : 0} />

      <section className="card p-5 fade-up sm:p-7">
        <p className="text-[16.5px] font-medium leading-relaxed">{question.question_text}</p>

        <div className="mt-5 space-y-2.5">
          {question.options.map((opt) => {
            const isPicked = chosen === opt.key;
            const isRight = answeredNow && result!.correct_key.toLowerCase() === opt.key;
            const isWrongPick = answeredNow && isPicked && !isRight;
            const cls = isRight ? "opt opt-correct" : isWrongPick ? "opt opt-wrong" : "opt";
            return (
              <button
                key={opt.key}
                type="button"
                className={cls}
                disabled={chosen !== null || busy}
                onClick={() => void submit(opt.key)}
              >
                <span className="opt-key">{opt.key}</span>
                <span className="flex-1">{opt.text}</span>
                {isRight && <CheckCircle2 size={17} className="text-[var(--sage)]" />}
                {isWrongPick && <XCircle size={17} className="text-[var(--rose)]" />}
              </button>
            );
          })}
        </div>

        {busy ? (
          <p className="muted mt-4 flex items-center gap-2 text-[13px]">
            <Loader2 size={14} className="animate-spin" /> Checking…
          </p>
        ) : null}

        {error ? <div className="mt-4"><ErrorNote message={error} /></div> : null}

        {answeredNow ? (
          <p className={`mt-4 text-[13.5px] font-semibold ${result!.correct ? "sage" : "text-[var(--rose)]"}`}>
            {result!.correct ? "Correct." : `Not quite — the answer was ${result!.correct_key.toUpperCase()}. ${result!.correct_text}`}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void endSession()} disabled={busy}>
            <Clock size={14} /> End session
          </button>
          <button type="button" className="btn btn-primary" onClick={nextQuestion} disabled={!answeredNow || busy}>
            Next question <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
