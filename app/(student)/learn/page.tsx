"use client";

/* Learn — the full syllabus with live mastery, YouTube help for every topic,
   and instant AI practice. Everything reads from /api/learn; quizzes come
   from /api/quiz (server-scored, answers never leak to the client). */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import QuizRunner from "@/components/quiz-runner";

interface LearnTopic {
  id: string;
  index: number;
  name: string;
  mastery: number | null;
  yt: string;
}
interface LearnChapter {
  id: string;
  no: number;
  name: string;
  yt: string;
  progress: number;
  mastered: number;
  total: number;
  topics: LearnTopic[];
}
interface LearnSubject {
  id: string;
  name: string;
  progress: number;
  mastered: number;
  total: number;
  chapters: LearnChapter[];
}
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  difficulty: number;
  explanation: string;
}

function MasteryBar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const color =
    value === null
      ? "var(--text-3)"
      : pct >= 85
        ? "var(--sage)"
        : pct >= 50
          ? "var(--ember)"
          : "var(--rose)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(240,216,180,0.08)]">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function LearnPage() {
  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<{ title: string; questions: QuizQuestion[]; run: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ subjects: LearnSubject[] }>("/api/learn");
      setSubjects(data.subjects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your syllabus. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subject = subjects[subjectIdx] ?? null;

  const toggleChapter = (id: string) =>
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startQuiz = async (topic: LearnTopic, chapter: LearnChapter) => {
    if (busyTopic) return;
    setBusyTopic(topic.id);
    setError(null);
    try {
      const res = await apiFetch<{ questions: QuizQuestion[] }>("/api/quiz", {
        method: "POST",
        body: { action: "generate", topicId: topic.id, count: 5 },
      });
      if (!res.questions?.length) throw new Error("Mitra couldn't set this quiz right now. Try again shortly.");
      setQuiz({
        title: `${chapter.name} · ${topic.name}`,
        questions: res.questions,
        run: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That quiz didn't load. Try once more.");
    } finally {
      setBusyTopic(null);
    }
  };

  const overall = useMemo(() => {
    if (!subjects.length) return 0;
    const total = subjects.reduce((a, s) => a + s.total, 0);
    const sum = subjects.reduce((a, s) => a + s.progress * s.total, 0);
    return total ? sum / total : 0;
  }, [subjects]);

  if (quiz) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <QuizRunner
          title={quiz.title}
          subtitle="Quick check — mastery updates as you answer"
          questions={quiz.questions}
          onExit={() => setQuiz(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="fade-up">
        <h1 className="display text-[30px] font-semibold sm:text-[34px]">Learn</h1>
        <p className="muted mt-1.5 text-[14.5px]">
          Your full syllabus, one honest mastery bar at a time. Open a topic, watch, then prove it.
        </p>
      </div>

      {loading && (
        <div className="card mt-6 flex items-center gap-3 p-6 text-[14px]">
          <Loader2 size={17} className="animate-spin text-[var(--ember)]" />
          <span className="muted">Opening your syllabus…</span>
        </div>
      )}

      {!loading && error && (
        <div className="card mt-6 p-6">
          <p className="text-[14px]" style={{ color: "var(--rose)" }}>
            {error}
          </p>
          <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => void load()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      {!loading && subject && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {subjects.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-sm"
                style={
                  i === subjectIdx
                    ? { borderColor: "var(--ember)", color: "var(--ember)" }
                    : undefined
                }
                onClick={() => setSubjectIdx(i)}
              >
                <GraduationCap size={14} /> {s.name} · {Math.round(s.progress * 100)}%
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {subject.chapters.map((chapter) => {
              const open = openChapters.has(chapter.id);
              return (
                <div key={chapter.id} className="card overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15.5px] font-semibold">
                        <span className="faint mr-2 text-[12.5px]">Ch {chapter.no}</span>
                        {chapter.name}
                      </p>
                      <p className="faint mt-1 text-[12px]">
                        {chapter.mastered}/{chapter.total} topics mastered ·{" "}
                        {Math.round(chapter.progress * 100)}%
                      </p>
                    </div>
                    <div className="flex w-28 shrink-0 items-center gap-2">
                      <MasteryBar value={chapter.progress} />
                      <span className="faint text-[11px]">{open ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-[var(--line)] px-4 pb-4 pt-3">
                      <a
                        href={chapter.yt}
                        target="_blank"
                        rel="noreferrer"
                        className="muted mb-3 inline-flex items-center gap-1.5 text-[12.5px] hover:text-[var(--ember)]"
                      >
                        <ExternalLink size={12} /> Full chapter video on YouTube
                      </a>
                      <ul className="space-y-2.5">
                        {chapter.topics.map((topic) => (
                          <li key={topic.id} className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px]">{topic.name}</p>
                              <div className="mt-1 max-w-[220px]">
                                <MasteryBar value={topic.mastery} />
                              </div>
                            </div>
                            <a
                              href={topic.yt}
                              target="_blank"
                              rel="noreferrer"
                              className="faint hover:text-[var(--sky)]"
                              title="Watch on YouTube"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busyTopic === topic.id}
                              onClick={() => void startQuiz(topic, chapter)}
                            >
                              {busyTopic === topic.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Sparkles size={13} />
                              )}
                              Practise
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
