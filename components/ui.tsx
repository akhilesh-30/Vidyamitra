import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

/* Small shared primitives used across the student surface. Kept presentational
   (no hooks) so both server and client components can render them, and styled
   purely with the classes already defined in app/globals.css. */

export function SectionHeading({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[19px] font-semibold">{title}</h2>
        {hint ? <p className="muted mt-1 text-[13px]">{hint}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Bar({
  value,
  tone = "ember",
}: {
  /** 0..1 */
  value: number;
  tone?: "ember" | "sage" | "rose";
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100);
  const cls = tone === "sage" ? "progress progress-sage" : tone === "rose" ? "progress progress-rose" : "progress";
  return (
    <div className={cls} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "ember",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ember" | "sage" | "rose" | "sky";
}) {
  const color =
    tone === "sage" ? "var(--sage)" : tone === "rose" ? "var(--rose)" : tone === "sky" ? "var(--sky)" : "var(--ember)";
  return (
    <div className="card p-4">
      <p className="faint text-[11.5px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="display mt-1.5 text-[26px] font-semibold leading-none" style={{ color }}>
        {value}
      </p>
      {hint ? <p className="faint mt-1.5 text-[12px]">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--text-3)]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--ember)]" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div
      className="card flex flex-wrap items-center justify-between gap-3 p-4"
      style={{ borderColor: "rgba(224,139,139,0.35)" }}
    >
      <p className="text-[13.5px] text-[var(--rose)]">{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      {icon ? <span className="mb-1 text-[var(--text-3)]">{icon}</span> : null}
      <p className="text-[15px] font-semibold">{title}</p>
      {text ? <p className="muted max-w-sm text-[13px] leading-relaxed">{text}</p> : null}
      {action}
    </div>
  );
}

export function Done({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 size={18} className="shrink-0 text-[var(--sage)]" />
  ) : (
    <span className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-[var(--line-strong)]" />
  );
}
