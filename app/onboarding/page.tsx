"use client";

/* Onboarding — three gentle steps: who you are, what you study, where you study. */

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, GraduationCap, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { BOARD_LABEL, type BoardId } from "@/lib/curriculum/types";

const GRADES = [5, 6, 7, 8, 9, 10];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [board, setBoard] = useState<BoardId | null>(null);
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFinish = grade !== null && board !== null && name.trim().length > 0;

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (!canFinish || !board || grade === null) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/onboarding", {
        method: "POST",
        body: { name, class_level: grade, board, age: age ? Number(age) : null, school: school || null },
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg fade-up">
        {/* progress dots */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? "w-9 bg-[var(--ember)]" : s < step ? "w-5 bg-[var(--ember-deep)]" : "w-5 bg-[rgba(242,237,227,0.12)]"}`}
            />
          ))}
        </div>

        <div className="card p-7 sm:p-8">
          {step === 1 && (
            <div className="fade-up">
              <h1 className="text-2xl font-semibold">Hello! Who&apos;s joining?</h1>
              <p className="muted mt-1.5 text-[14px]">Your name stays yours — it shows only on your own screen.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="name">Your name</label>
                  <input id="name" className="input" placeholder="e.g. Aarav" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <label className="label" htmlFor="age">Age <span className="faint font-normal">(optional)</span></label>
                  <input id="age" type="number" min={8} max={20} className="input" placeholder="e.g. 13" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary mt-6 w-full" disabled={name.trim().length === 0} onClick={() => setStep(2)}>
                Next <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-up">
              <h1 className="text-2xl font-semibold">Your class &amp; board</h1>
              <p className="muted mt-1.5 text-[14px]">This picks your exact syllabus — every chapter of it.</p>
              <div className="mt-6">
                <span className="label">Class</span>
                <div className="grid grid-cols-6 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`mood-face !h-12 !w-full !text-[15px] !rounded-xl font-semibold ${grade === g ? "selected" : ""}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <span className="label">Board</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(BOARD_LABEL) as BoardId[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBoard(b)}
                      className={`opt justify-center font-semibold ${board === b ? "!border-[var(--ember)] !bg-[rgba(240,178,90,0.09)]" : ""}`}
                    >
                      {board === b && <Check size={15} className="ember" />}
                      {BOARD_LABEL[b]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-2.5">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary flex-1" disabled={grade === null || board === null} onClick={() => setStep(3)}>
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form className="fade-up" onSubmit={finish}>
              <h1 className="text-2xl font-semibold">Your school</h1>
              <p className="muted mt-1.5 text-[14px]">
                We use this to connect you with your school&apos;s counsellor — only if you ever need it.
              </p>
              <div className="mt-6">
                <label className="label" htmlFor="school">School name <span className="faint font-normal">(optional)</span></label>
                <input id="school" className="input" placeholder="e.g. Delhi Public School" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} />
              </div>
              {error && <p className="field-error mt-3">{error}</p>}
              <div className="mt-6 flex gap-2.5">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} disabled={busy}>Back</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={busy || !canFinish}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : (<><GraduationCap size={16} /> Enter your field</>)}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
