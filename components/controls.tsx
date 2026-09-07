import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[0.95rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimary = `${btnBase} bg-pine text-[#f6f8f4] hover:bg-pine-deep`;
export const btnGhost = `${btnBase} border border-line bg-card text-ink hover:border-steel/40 hover:bg-mist/50`;
export const btnRose = `${btnBase} bg-rose/10 text-rose hover:bg-rose/20`;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "rose" };

export function Button({ variant = "primary", className = "", ...rest }: BtnProps) {
  const cls = variant === "primary" ? btnPrimary : variant === "rose" ? btnRose : btnGhost;
  return <button className={`${cls} ${className}`} {...rest} />;
}

type LinkBtnProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
};

export function LinkButton({ href, children, variant = "primary", className = "", onClick }: LinkBtnProps) {
  const cls = variant === "primary" ? btnPrimary : btnGhost;
  return (
    <Link href={href} className={`${cls} ${className}`} onClick={onClick}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.95rem] font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm text-steel">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-[1rem] text-ink placeholder:text-steel/70 focus:border-pine focus:outline-none";

export function PageTitle({ children, kicker }: { children: ReactNode; kicker?: string }) {
  return (
    <div className="mb-6">
      {kicker ? <p className="mb-1 text-[0.85rem] font-medium tracking-wide text-steel">{kicker}</p> : null}
      <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">{children}</h1>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg border border-rose/30 bg-rose/5 px-3.5 py-2.5 text-[0.95rem] text-rose">
      {message}
    </p>
  );
}

/** Quiet wordmark used on landing + auth pages. */
export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <Link href="/" className={`font-display font-semibold text-pine ${large ? "text-[1.5rem]" : "text-[1.2rem]"}`}>
      Vidyamitra
    </Link>
  );
}
