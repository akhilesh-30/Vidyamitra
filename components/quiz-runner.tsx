"use client";

/* Shared quiz engine — used by topic tests (/learn) and timed chapter tests
   (/exam). Scoring is done server-side, so the answer key never reaches the
   browser. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, PartyPopper, RotateCcw, Timer, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Bar } from "@/components/ui";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  difficulty: number;
  explanation: string | null;
}

interface AnswerResult {
  correctIndex: number;
  correctLetter: string;
  correctText: string | null;
  mastery: number | null;
  topicName: string | null;
  explanation: string | null;
}

const LETTERS = ["a", "b", "c", "d", "e", "f"];

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizRunner({
  title,
  subtitle,
  questions,
  timedMinutes,
  onExit,
  onFinished,
}: {
  title: string;
  subtitle?: string;
  questions: QuizQuestion[];
  /** Exam mode: a countdown that ends the paper on its own. */
  timedMinutes?: number;
  onExit: () => void;
  onFinished?: (summary: { correct: number; total: number; mastery: number | null }) => void;
}) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [mastery, setMastery] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(timedMinutes ? timedMinutes * 60 : null);

  const askedAt = useRef<number>(Date.now());
  const reported = useRef(false);

  const q: QuizQuestion | undefined = questions[index];

  /* exam countdown */
  useEffect(() => {
    if (secondsLeft === null || done) return;
    if (secondsLeft <= 0) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, done]);

  useEffect(() => {
    askedAt.current = Date.now();
  }, [index]);

  /* report the summary exactly once, so progress is never double-counted */
  useEffect(() => {
    if (!done || reported.current) return;
    reported.current = true;
    onFinished?.({ correct: correctCount, total, mastery });
  }, [done, correctCount, total, mastery, onFinished]);

  const submit = useCallback(
    async (optionIndex: number) => {
      if (!q || selected !== null || busy || done) return;
      setSelected(optionIndex);
      setBusy(true);
      setError(null);
      const seconds = Math.max(Math.round((Date.now() - askedAt.current) / 1000), 1);
      try {
        const res = await apiFetch<AnswerResult>("/api/quiz", {
          method: "POST",
          body: {
            action: "answer",
            questionId: q.id,
            selectedIndex: optionIndex,
            timeTakenSeconds: seconds,
          },
        });
        setResult(res);
        if (typeof res.mastery === "number") setMastery(res.mastery);
        if (optionIndex === res.correctIndex) setCorrectCount((c) => c + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "That answer didn't save. Try once more.");
      } finally {
        setBusy(false);
      }
    },
    [busy, done, q, selected]
  );

  function advance() {
    if (index + 1 >= total) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setResult(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setResult(null);
    setCorrectCount(0);
    setMastery(null);
    setError(null);
    setDone(false);
    reported.current = false;
    setSecondsLeft(timedMinutes ? timedMinutes * 60 : null);
  }

  /* ---------- finished ---------- */
  if (done) {
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    const tone = pct >= 80 ? "sage" : pct >= 50 ? "ember" : "rose";
    return (
      <div className="card p-6 fade-up sm:p-8">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(143,185,150,0.14)] text-[var(--sage)]">
          <PartyPopper size={22} />
        </span>
        <h3 className="text-center text-2xl font-semibold">
          {pct >= 80 ? "Beautiful work." : pct >= 50 ? "Solid — and fixable." : "Good that you tried."}
        </h3>
        <p className="muted mx-auto mt-2 max-w-md text-center text-[14px] leading-relaxed">
          {pct >= 80
            ? "You knew this well. One more pass tomorrow and it stays yours."
            : pct >= 50
              ? "You're past halfway. Read the explanations you missed, then run this again — it gets easier."
              : "This topic is still settling. That's information, not failure. Revise the notes, then retry."}
        </p>

        <div className="mt-7 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[24px] font-semibold">
              {correctCount}/{total}
            </p>
            <p className="faint text-[11.5px]">correct</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[24px] font-semibold">{pct}%</p>
            <p className="faint text-[11.5px]">score</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="display text-[24px] font-semibold">
              {mastery === null ? "—" : `${Math.round(mastery * 100)}%`}
            </p>
            <p className="faint text-[11.5px]">mastery</p>
          </div>
        </div>

        {mastery !== null && (
          <div className="mt-5">
            <Bar value={mastery} tone={tone} />
            <p className="faint mt-2 text-center text-[12px]">
              Your mastery bar updates as you practise — it feeds tomorrow&apos;s plan.
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-ghost" onClick={restart}>
            <RotateCcw size={15} /> Try again
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={onExit}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="card p-8 text-center">
        <p className="muted text-[14px]">This test has no questions yet.</p>
        <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={onExit}>
          Go back
        </button>
      </div>
    );
  }

  const answered = selected !== null && result !== null;

  return (
    <div className="card p-5 fade-up sm:p-7">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold">{title}</h3>
          {subtitle ? <p className="faint mt-0.5 text-[12.5px]">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {secondsLeft !== null && (
            <span className={`chip ${secondsLeft <= 60 ? "chip-rose" : "chip-ember"}`}>
              <Timer size={13} /> {fmt(Math.max(secondsLeft, 0))}
            </span>
          )}
          <span className="chip">
            {index + 1} / {total}
          </span>
        </div>
      </div>

      <Bar value={total ? index / total : 0} />

      <p className="mt-6 text-[16.5px] font-medium leading-relaxed">{q.question}</p>

      <div className="mt-5 space-y-2.5">
        {q.options.map((opt, i) => {
          const isPicked = selected === i;
          const isRight = answered && result!.correctIndex === i;
          const isWrongPick = answered && isPicked && !isRight;
          const cls = isRight ? "opt opt-correct" : isWrongPick ? "opt opt-wrong" : "opt";
          return (
            <button
              key={`${q.id}-${i}`}
              type="button"
              className={cls}
              disabled={selected !== null || busy}
              onClick={() => void submit(i)}
            >
              <span className="opt-key">{LETTERS[i] ?? i + 1}</span>
              <span className="flex-1">{opt}</span>
              {isRight && <CheckCircle2 size={17} className="text-[var(--sage)]" />}
              {isWrongPick && <XCircle size={17} className="text-[var(--rose)]" />}
            </button>
          );
        })}
      </div>

      {busy && (
        <p className="muted mt-4 flex items-center gap-2 text-[13px]">
          <Loader2 size={14} className="animate-spin" /> Checking…
        </p>
      )}

      {error && (
        <p className="mt-4 text-[13.5px] text-[var(--rose)]">
          {error} <span className="faint">Your mastery wasn&apos;t affected.</span>
        </p>
      )}

      {answered && (
        <div className="fade-up mt-5 rounded-xl border border-[var(--line)] bg-[rgba(242,237,227,0.03)] p-4">
          <p className={`text-[13.5px] font-semibold ${selected === result!.correctIndex ? "sage" : "text-[var(--rose)]"}`}>
            {selected === result!.correctIndex
              ? "Correct."
              : `Not quite — the answer was ${result!.correctLetter.toUpperCase()}.`}
          </p>
          {result!.explanation ? (
            <p className="muted mt-1.5 text-[13.5px] leading-relaxed">{result!.explanation}</p>
          ) : (
            <p className="muted mt-1.5 text-[13.5px] leading-relaxed">
              {selected === result!.correctIndex
                ? "Keep that reasoning — it's the one to reuse in the exam."
                : `The right option was: ${result!.correctText ?? "—"}. Read it once slowly, then move on.`}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2.5">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExit} disabled={busy}>
          Leave test
        </button>
        <button type="button" className="btn btn-primary" onClick={advance} disabled={!answered || busy}>
          {index + 1 >= total ? "See my score" : "Next question"} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
