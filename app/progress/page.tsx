import type { Metadata } from "next";
import { ProgressView } from "@/components/student/progress-view";

export const metadata: Metadata = {
  title: "My progress",
  description: "How your subjects are growing, and how the load looks ahead.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
