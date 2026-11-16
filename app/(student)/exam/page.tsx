"use client";

/* Exam mode — AI revision sheet + timed test paper, per chapter. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, Clock, History, NotebookPen } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Bar, ErrorNote, SectionHeading, Spinner } from "@/components/ui";
import QuizRunner from "@/components/quiz-runner";

interface ApiChapter {
  id: string; no: number; name: string; yt: string;
  progress: number; mastered: number; total: number;
  topics: { id: string; index: number; name: string; mastery: number | null }[];
}
interface ApiSubject { id: string; name: string; progress: number; mastered: number; total: number; chapters: ApiChapter[]; }
interface NotesResult { chapterId: string; chapterName: string; points: string[]; formulas: string[]; mnemonics: string[]; source: string; }
interface TestResult { chapterId: string; chapterName: string; durationMinutes: number; questions: { id: string; question: string; options: string[]; difficulty: number; explanation: string }[]; }

export default function ExamPage() {
  const [subjects, setSubjects] = useState<ApiSubject[] | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [boardLabel, setBoardLabel] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [tab, setTab] = useState<"notes" | "test">("notes");
  const [notes, setNotes] = useState<NotesResult | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await apiFetch<{ student: { class_level: number; board: string }; subjects: ApiSubject[] }>("/api/learn");
      setSubjects(res.subjects); setGrade(res.student.class_level);
      setBoardLabel(res.student.board === "CBSE" ? "CBSE" : "Maharashtra board");
      setSubjectId(res.subjects[0]?.id ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't open your syllabus just now.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const subject = useMemo(() => subjects?.find((s) => s.id === subjectId) ?? null, [subjects, subjectId]);
  const chapter = useMemo(() => subject?.chapters.find((c) => c.id === chapterId) ?? null, [subject, chapterId]);

  
  const [lastScore, setLastScore] = useState<string | null>(null);


  const openNotes = useCallback(async (id: string) => {
    setChapterId(id); setNotes(null); setTest(null); setTab("notes");
    setNotesBusy(true); setNotesError(null);
    try {
      const res = await apiFetch<NotesResult>("/api/exam", { method: "POST", body: { action: "notes", chapterId: id } });
      setNotes(res);
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : "Revision sheet didn't load. Try once more.");
    } finally { setNotesBusy(false); }
  }, []);

  const openTest = useCallback(async (id: string) => {
    setChapterId(id); setNotes(null); setTest(null); setTab("test");
    setTestBusy(true); setTestError(null);
    try {
      const res = await apiFetch<TestResult>("/api/exam", { method: "POST", body: { action: "test", chapterId: id } });
      setTest(res);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test paper didn't load. Try once more.");
    } finally { setTestBusy(false); }
  }, []);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <SectionHeading title="Exam mode" hint="Revision sheets and timed test papers." />
        <ErrorNote message={loadError} onRetry={() => void load()} />
      </div>
    );
  }
  if (!subjects) {
    return (
      <div className="mx-auto max-w-3xl">
        <SectionHeading title="Exam mode" hint="Revision sheets and timed test papers." />
        <Spinner label="Opening your syllabus…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4">
      <SectionHeading
        title="Exam mode"
        hint={grade === null
          ? "Ten quiet minutes here is worth an hour of panic later."
          : `Class ${grade} · ${boardLabel} · built for the last 30 minutes before a test`}
        right={lastScore ? <span className="chip chip-sage"><History size={13} /> {lastScore}</span> : null}
      />

      {/* subject picker */}
      <div className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button key={s.id} type="button"
            onClick={() => { setSubjectId(s.id); setChapterId(null); setNotes(null); setTest(null); setTab("notes"); }}
            className={`btn btn-sm ${s.id === subjectId ? "btn-primary" : "btn-ghost"}`}>
            {s.name} <span className="faint ml-1 text-[11px] font-normal">{s.mastered}/{s.total}</span>
          </button>
        ))}
      </div>

      {/* chapter picker */}
      {subject ? (
        <section className="card fade-up fade-up-1 p-5">
          <p className="muted mb-3.5 text-[13px]">Pick a chapter to revise or test yourself on.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {subject.chapters.map((c) => {
              const active = c.id === chapterId;
              return (
                <button key={c.id} type="button"
                  onClick={() => { setChapterId(c.id); setNotes(null); setTest(null); setTab("notes"); }}
                  className={`rounded-xl border p-3 text-left transition ${
                    active ? "border-[var(--ember)] bg-[rgba(240,178,90,0.09)]"
                           : "border-[var(--line-strong)] bg-[rgba(242,237,227,0.03)] hover:border-[rgba(240,178,90,0.4)]"
                  }`}>
                  <div className="flex items-baseline gap-2">
                    <span className="faint text-[11.5px] font-semibold">CH {c.no}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.name}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <Bar value={c.progress} tone={c.progress >= 0.85 ? "sage" : c.progress >= 0.4 ? "ember" : "rose"} />
                    <span className="faint shrink-0 text-[11px]">{Math.round(c.progress * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* notes view */}
      {chapter && tab === "notes" && (
        <section className="card fade-up fade-up-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold">Chapter {chapter.no}: {chapter.name}</h3>
            <button type="button" className="btn btn-sm" onClick={() => void openTest(chapter.id)}>
              <Clock size={13} /> Timed test
            </button>
          </div>

          {!notes && !notesBusy && (
            <button type="button" className="btn btn-primary" onClick={() => void openNotes(chapter.id)}>
              <NotebookPen size={15} /> Generate revision sheet
            </button>
          )}

          {notesBusy && <Spinner label="Lily Ai is writing your cheat sheet…" />}
          {notesError && <ErrorNote message={notesError} />}

          {notes && (
            <div className="mt-4 space-y-5">
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--ember)] mb-2 flex items-center gap-1.5">
                  <BookMarked size={14} /> Key points
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  {notes.points.map((p, i) => (
                    <li key={`p-${i}`} className="muted text-[13.5px] leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>

              {notes.formulas.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[var(--sage)] mb-2">Formula sheet</h4>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {notes.formulas.map((f, i) => (
                      <div key={`f-${i}`} className="rounded-lg border border-[var(--line)] bg-[rgba(242,237,227,0.02)] p-2.5 font-mono text-[12.8px]">{f}</div>
                    ))}
                  </div>
                </div>
              )}

              {notes.mnemonics.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[var(--sky)] mb-2">Memory tricks</h4>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {notes.mnemonics.map((m, i) => (
                      <li key={`m-${i}`} className="muted text-[13.5px] leading-relaxed">{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="faint text-[11.5px]">Source: {notes.source}</p>
            </div>
          )}
        </section>
      )}

      {/* test view */}
      {chapter && tab === "test" && (
        <section className="card fade-up fade-up-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold">Chapter {chapter.no}: {chapter.name}</h3>
            <button type="button" className="btn btn-sm"
              onClick={() => { setChapterId(chapter.id); setNotes(null); setTest(null); setTab("notes"); }}>
              <BookMarked size={13} /> Revision notes
            </button>
          </div>

          {!test && !testBusy && (
            <button type="button" className="btn btn-primary" onClick={() => void openTest(chapter.id)}>
              <Clock size={15} /> Start timed test
            </button>
          )}

          {testBusy && <Spinner label="Setting up your test paper…" />}
          {testError && <ErrorNote message={testError} />}

          {test && (
            <div className="mt-4">
              <p className="mb-3 text-[13.5px]">
                <Clock size={13} className="mr-1 inline" /> {test.durationMinutes} min · {test.questions.length} questions
              </p>
              <QuizRunner
                title={test.chapterName}
                subtitle={`Chapter ${chapter.no} test`}
                questions={test.questions.map((q) => ({
                  id: q.id, question: q.question, options: q.options,
                  difficulty: q.difficulty, explanation: q.explanation,
                }))}
                timedMinutes={test.durationMinutes}
                onExit={() => { setTest(null); setChapterId(null); }}
                onFinished={(summary) => {
                  const pct = Math.round((summary.correct / summary.total) * 100);
                  setLastScore(`${pct}% on ${test.chapterName}`);
                }}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
