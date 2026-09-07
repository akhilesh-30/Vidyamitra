"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { StudentRow } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "My progress" },
  { href: "/checkin", label: "How I feel" },
];

export function StudentShell({ student, children }: { student: StudentRow; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await getBrowserClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="font-display text-[1.15rem] font-semibold text-pine"
            aria-label="Vidyamitra home"
          >
            Vidyamitra
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-[0.92rem]" aria-label="Main">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-md px-2.5 py-1.5 font-medium ${
                    active ? "bg-mist text-pine-deep" : "text-steel hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-steel sm:inline">
              {student.name ? `Hi, ${student.name}` : "Hi there"} · Class {student.class_level}
            </span>
            <button onClick={signOut} className="font-medium text-steel underline-offset-2 hover:text-rose">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function AuthGuardPage({
  student,
  children,
}: {
  student: StudentRow;
  children: ReactNode;
}) {
  return <StudentShell student={student}>{children}</StudentShell>;
}
