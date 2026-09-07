"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, RequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { StudentShell } from "@/components/student-shell";
import { Button } from "@/components/controls";
import type { PracticeQuestion } from "@/lib/types";

/* --------------------------------------------------------------------
   Practice (F3) — one question at a time, timed honestly but quietly.

   The timer runs for the stress model (it needs real time-taken data)
   but is shown as a soft count-up, never a countdown — nothing here
   should make an already-pressured kid rush. Motion happens only on
   the answer reveal and the finish summary.
   -------------------------------------------------------------------- */

type FinishInfo = {
  masteryUpdates: { topic_name: string; mastery: number }[];
  stress: { score: "low" | "medium" | "high" } | null;
  plan: { quota: number; queue: { name: string; kind: string }[] };
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function PracticeView() {
  const { state } = useAuth();
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [doneReason, setDoneReason] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ correct: boolean; correct_text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [quota, setQuota] = useState<number | null>(null);
  const [finish, setFinish] = useState<FinishInfo | null>(null);
  const [finishing, setFinishing] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const seenQuestions = useRef<string[]>([]);

  const askNext = useCallback(async () => {
    setLoadError(null);
    setSelected(null);
    setVerdict(null);
    try {
      const res = await apiFetch<PracticeQuestion | { done: true; doneReason: string } | { status: string }>(
        `/api/practice/next?exclude=${encodeURIComponent(seenQuestions.current.join(","))}`
      );
      if ("done" in res && res.done) {
        setDoneReason(res.doneReason);
        setQuestion(null);
      } else if ("status" in res && res.status === "empty") {
        setDoneReason("No questions are left for today's plan. Try again tomorrow — the garden keeps whatever you've grown.");
        setQuestion(null);
      } else if ("question_id" in res) {
        const q = res as PracticeQuestion;
        setQuestion(q);
        setQuota(q.quota);
        startedAt.current = Date.now();
      } else {
        setDoneReason("Nothing is practiceable right now. Come back after your next class covers something new.");
        setQuestion(null);
      }
    } catch (e) {
      if (e instanceof RequestError && (e.code === "UNAUTHENTICATED" || e.code === "NO_PROFILE")) throw e;
      setLoadError("Couldn't get the next question. Check your internet and try again.");
    }
  }, []);

  useEffect(() => {
    void askNext();
  }, [askNext]);

  const submit = async (key: string) => {
    if (!question || verdict) return;
    setSelected(key);
    setSubmitting(true);
    const timeTaken = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const res = await apiFetch<{ correct: boolean; correct_text: string }>("/api/practice/submit", {
        method: "POST",
        body: { question_id: question.question_id, selected_key: key, time_taken_seconds: timeTaken },
      });
      setVerdict({ correct: res.correct, correct_text: res.correct_text });
      seenQuestions.current.push(question.question_id);
      setAnsweredCount((c) => c + 1);
      if (res.correct) setCorrectCount((c) => c + 1);
    } catch {
      setLoadError("That answer didn't save. Nothing was lost — tap your choice again.");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const finishSession = async () => {
    setFinishing(true);
    try {
      const res = await apiFetch<FinishInfo>("/api/practice/finish", { method: "POST" });
      setFinish(res);
    } catch {
      // The attempt rows are already saved; only the summary failed.
      setLoadError("Your answers are saved, but the summary didn't load. You can head home.");
    } finally {
      setFinishing(false);
    }
  };

  /* ----- auth gates (same pattern as the other student pages) ----- */
  if (state.status === "loading") {
    return <div className="flex min-h-dvh items-center justify-center text-steel">Loading…</div>;
  }
  if (state.status === "anon" || state.status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink">Your session has run out. Sign in again and you'll be right back.</p>
        <Link href="/login" className="text-pine underline underline-offset-2">Go to sign-in</Link>
      </div>
    );
  }
  if (state.status === "no-profile") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink">Almost there — we just need to know your class and board before you start.</p>
        <Link href="/onboarding" className="text-pine underline underline-offset-2">Finish setting up</Link>
      </div>
    );
  }
  const student = state.student;

  /* ----- finished summary ----- */
  if (finish) {
    const tried = finish.masteryUpdates.length > 0;
    return (
      <StudentShell student={student}>
        <div className="answer-reveal mx-auto max-w-lg py-8 text-center">
          <h1 className="font-display text-[2rem] font-semibold text-ink">Session done</h1>
          <p className="mt-2 text-[1.02rem] text-ink">
            You answered {answeredCount} question{answeredCount === 1 ? "" : "s"} — {correctCount} right
            {answeredCount > 0 ? ` (${Math.round((correctCount / answeredCount) * 100)}%)` : ""}. Saved.
          </p>

          {tried ? (
            <div className="note-card mt-6 px-5 py-4 text-left">
              <p className="text-[0.95rem] font-semibold text-ink">What this session changed</p>
              <ul className="mt-2 space-y-1">
                {finish.masteryUpdates.map((m) => (
                  <li key={m.topic_name} className="flex items-baseline justify-between gap-3 text-[0.95rem]">
                    <span className="text-ink">{m.topic_name}</span>
                    <span className="tabular-nums text-steel">{Math.round(m.mastery * 100)}% sure</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {finish.stress ? (
            <p className="mt-4 text-[0.95rem] text-steel">
              {finish.stress.score === "high"
                ? "Today still reads as heavy, so tomorrow starts light. Rest counts as progress too."
                : finish.stress.score === "medium"
                  ? "Today felt a bit heavy, so the plan stays gently trimmed."
                  : "Nothing worrying in how today went."}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/checkin" className="rounded-lg bg-pine px-5 py-2.5 text-[0.95rem] font-semibold text-[#f6f8f4] hover:bg-pine-deep">
              Say how this felt
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-line bg-card px-5 py-2.5 text-[0.95rem] font-semibold text-ink hover:bg-mist/50">
              Back home
            </Link>
          </div>
        </div>
      </StudentShell>
    );
  }

  /* ----- nothing due ----- */
  if (doneReason && !question) {
    return (
      <StudentShell student={student}>
        <div className="answer-reveal mx-auto max-w-lg py-12 text-center">
          <h1 className="font-display text-[1.6rem] font-semibold text-ink">That's everything for now</h1>
          <p className="mt-3 text-[1rem] text-steel">{doneReason}</p>
          <p className="mt-1 text-[0.95rem] text-steel">
            {answeredCount > 0
              ? `You still answered ${answeredCount} question${answeredCount === 1 ? "" : "s"} this session — ${correctCount} right.`
              : "Nothing was due today."}
          </p>
          <div className="mt-6">
            <Link href="/checkin" className="text-pine underline underline-offset-2">Say how today felt</Link>
          </div>
        </div>
      </StudentShell>
    );
  }

  /* ----- the question ----- */
  return (
    <StudentShell student={student}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-baseline justify-between text-sm text-steel">
          <span>
            {question ? `Question ${question.index}` : "Question"}
            {quota !== null ? ` · today's plan: about ${quota}` : ""}
          </span>
          {answeredCount > 0 ? (
            <span className="tabular-nums">
              {correctCount}/{answeredCount} right so far
            </span>
          ) : null}
        </div>

        {loadError ? (
          <p role="alert" className="mb-4 rounded-lg border border-rose/30 bg-rose/5 px-3.5 py-2.5 text-[0.95rem] text-rose">
            {loadError}
          </p>
        ) : null}

        {question ? (
          <div className="note-card px-5 py-6">
            <p className="mb-1 text-sm text-steel">{question.topic_name}</p>
            <h1 className="font-display text-[1.3rem] font-semibold leading-snug text-ink">
              {question.question_text}
            </h1>

            <div className="mt-5 space-y-2.5">
              {question.options.map((opt) => {
                const isSelected = selected === opt.key;
                const showAsCorrect = verdict && isSelected && verdict.correct;
                const showAsWrong = verdict && isSelected && !verdict.correct;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={Boolean(verdict) || submitting}
                    onClick={() => submit(opt.key)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-[1rem] transition-colors ${
                      showAsCorrect
                        ? "border-pine bg-mist text-ink"
                        : showAsWrong
                          ? "border-rose/50 bg-rose/5 text-ink"
                          : verdict
                            ? "border-line bg-card text-steel"
                            : "border-line bg-card text-ink hover:border-pine/40"
                    }`}
                  >
                    <span className="mr-2 font-semibold text-steel">{opt.key}.</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {verdict ? (
              <div className="answer-reveal mt-5 border-t border-line pt-4">
                <p className={`text-[1rem] font-semibold ${verdict.correct ? "text-pine-deep" : "text-rose"}`}>
                  {verdict.correct ? "Right — nicely done." : "Not this time."}
                </p>
                {!verdict.correct ? (
                  <p className="mt-1 text-[0.95rem] text-ink">
                    The answer was: <span className="font-semibold">{verdict.correct_text}</span>
                  </p>
                ) : null}
                <div className="mt-4">
                  <Button onClick={() => void askNext()} disabled={submitting}>
                    Next question
                  </Button>
                  <button
                    type="button"
                    onClick={() => void finishSession()}
                    disabled={finishing}
                    className="ml-3 text-[0.92rem] font-medium text-steel underline underline-offset-2 hover:text-ink"
                  >
                    {finishing ? "Wrapping up…" : "Stop here for today"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="note-card px-5 py-10 text-center text-steel">Getting your first question…</div>
        )}

        {answeredCount >= 1 && !verdict ? (
          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => void finishSession()}
              disabled={finishing}
              className="text-[0.92rem] font-medium text-steel underline underline-offset-2 hover:text-ink"
            >
              {finishing ? "Wrapping up…" : "Stop here for today"}
            </button>
          </p>
        ) : null}
      </div>
    </StudentShell>
  );
}
