"use client";

/* Student shell — auth gate + calm navigation. Desktop: side rail.
   Mobile: bottom bar. Wraps every student page. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Brain, Flame, Gamepad2, HeartPulse, LayoutDashboard, LineChart, Loader2, LogOut,
  MessageCircleHeart, MoonStar, Sparkles, Trophy, BookOpen, Users,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/checkin", label: "Mood", icon: HeartPulse },
  { href: "/mitra", label: "Mitra", icon: MessageCircleHeart },
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

  useEffect(() => {
    if (state.status === "anon" || state.status === "error") router.replace("/login");
    if (state.status === "no-profile") router.replace("/onboarding");
  }, [state, router]);

  if (state.status !== "ready") {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-[13px]">Settling in…</span>
        </div>
      </main>
    );
  }

  const student = state.student;
  const firstName = (student.name ?? "friend").split(" ")[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
      {/* side rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--line)] px-4 py-5 lg:flex">
        <Link href="/dashboard" className="mb-7 flex items-center gap-2.5 px-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503]">
            <Brain size={18} strokeWidth={2.4} />
          </span>
          <span className="display text-[16px] font-semibold">Vidyamitra</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item ${pathname.startsWith(n.href) ? "active" : ""}`}>
              <n.icon size={17} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-[var(--line)] bg-[rgba(242,237,227,0.03)] p-3.5">
          <p className="text-[13px] font-semibold">{firstName}</p>
          <p className="faint mt-0.5 text-[11.5px]">Class {student.class_level} · {student.board === "CBSE" ? "CBSE" : "Maharashtra"}</p>
          <button onClick={() => void signOut()} className="muted mt-2.5 flex items-center gap-1.5 text-[12.5px] hover:text-[var(--rose)]">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 lg:px-7">
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#f0b25a] to-[#d4903c] text-[#241503]">
              <Brain size={16} strokeWidth={2.4} />
            </span>
            <span className="display text-[15px] font-semibold">Vidyamitra</span>
          </Link>
          <span className="hidden text-[13.5px] text-[var(--text-2)] lg:block">
            <MoonStar size={13} className="mr-1.5 inline -translate-y-px" />
            {greeting()}, {firstName}
          </span>
          <div className="flex items-center gap-2">
            <span className="chip chip-ember" title="Days in a row of learning or checking in">
              <Flame size={13} /> {streakPlaceholder()}
            </span>
            <Link href="/dashboard" className="chip chip-sage" title="Your daily plan is ready">
              <Sparkles size={13} /> Plan
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:px-7 lg:pb-10">{children}</main>
      </div>

      {/* mobile bottom bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-[var(--line)] px-1 py-1.5 lg:hidden">
        {MOBILE_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10.5px] font-medium ${pathname.startsWith(n.href) ? "text-[var(--ember)]" : "text-[var(--text-3)]"}`}
          >
            <n.icon size={18} />
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

/* The live streak comes with the /api/today payload on the dashboard page;
   the header shows a lightweight local value to avoid a second fetch. */
function streakPlaceholder(): string {
  if (typeof window === "undefined") return "0";
  return window.localStorage.getItem("vm_streak") ?? "0";
}
