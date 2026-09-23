import type { ReactNode } from "react";
import StudentShell from "@/components/student-shell";

/* Every signed-in student page shares this chrome: the auth gate, the side
   rail on desktop, the bottom bar on phones. Routes stay clean (/dashboard,
   /learn, …) because this is a route group, not a path segment. */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
