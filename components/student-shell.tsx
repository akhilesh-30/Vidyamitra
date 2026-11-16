"use client";

/* Student shell — auth gate + calm navigation. Desktop: side rail.
   Mobile: bottom bar. Chrome follows the landing hero: cream wordmark,
   uppercase tracked labels, one cream pill, hairline rules. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Brain, Flame, Gamepad2, HeartPulse, LayoutDashboard, LineChart, Loader2, LogOut,
  MessageCircleHeart, MoonStar, Sparkles, Trophy, BookOpen, Users,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Sparkles },
  { href: "/exam", label: "Exam", icon: MoonStar },
  { href: "/checkin", label: "Mood", icon: HeartPulse },
  { href: "/mitra", label: "Lily Ai", icon: MessageCircleHeart },
  { href: "/community", label: "Unburden", icon: Users },
  { href: "/games", label: "Mind Gym", icon: Gamepad2 },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/badges", label: "Badges", icon: Trophy },
];

const MOBILE_NAV = NAV.slice(0, 5);

export default function StudentShell({ children }: { children: ReactNode }) {
  const { state, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [streak, setStreak] = useState("0");

  // Read the streak after mount: touching localStorage during render would
  // make the server and client markup disagree (hydration error).
  useEffect(() => {
    setStreak(window.localStorage.getItem("vm_streak") ?? "0");
  }, [pathname]);

  useEffect(() => {
    if (state.status === "anon" || state.status === "error") router.replace("/login");
    if (state.status === "no-profile") router.replace("/onboarding");
  }, [state, router]);

  if (state.status !== "ready") {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-[11px] uppercase tracking-[0.16em]">Settling in…</span>
        </div>
      </main>
    );
  }

  const student = state.student;
  const firstName = (student.name ?? "friend").split(" ")[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
      {/* side rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--line)] px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-1.5" aria-label="Vidyamitra">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line-strong)] text-[var(--cream)]">
            <Brain size={15} strokeWidth={2} />
          </span>
          <span className="text-[17px] font-medium tracking-[-0.02em] text-[var(--cream)]">Vidyamitra</span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`shell-nav ${pathname.startsWith(n.href) ? "active" : ""}`}>
              <n.icon size={15} strokeWidth={1.8} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--line)] pt-4">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--cream)]">{firstName}</p>
          <p className="faint mt-1 text-[11px]">
            Class {student.class_level} · {student.board === "CBSE" ? "CBSE" : "Maharashtra"}
          </p>
          <button
            onClick={() => void signOut()}
            className="muted mt-3 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors hover:text-[var(--rose)]"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(5,8,13,0.72)] px-4 py-3 backdrop-blur-md lg:px-7">
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="Vidyamitra">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--line-strong)] text-[var(--cream)]">
              <Brain size={14} strokeWidth={2} />
            </span>
            <span className="text-[15px] font-medium tracking-[-0.02em] text-[var(--cream)]">Vidyamitra</span>
          </Link>
          <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-3)] lg:block">
            {greeting()}, {firstName}
          </span>
          <div className="flex items-center gap-2">
            <span className="chip chip-ember" title="Days in a row of learning or checking in">
              <Flame size={13} /> {streak}
            </span>
            <Link href="/dashboard" className="pill-cream" title="Your daily plan is ready">
              <Sparkles size={12} /> Today
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:px-7 lg:pb-10">{children}</main>
      </div>

      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-[var(--line)] bg-[rgba(5,8,13,0.86)] px-1 py-1.5 backdrop-blur-md lg:hidden">
        {MOBILE_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[8.5px] font-medium uppercase tracking-[0.1em] ${
              pathname.startsWith(n.href) ? "text-[var(--cream)]" : "text-[var(--text-3)]"
            }`}
          >
            <n.icon size={18} strokeWidth={1.8} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
