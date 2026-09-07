import type { Metadata } from "next";
import { PracticeView } from "@/components/student/practice-view";

export const metadata: Metadata = {
  title: "Practice",
  description: "A few questions, picked for how you're doing today.",
};

export default function PracticePage() {
  return <PracticeView />;
}
