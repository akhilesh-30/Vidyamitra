import type { Metadata } from "next";
import { CheckinView } from "@/components/student/checkin-view";

export const metadata: Metadata = {
  title: "How I feel",
  description: "Say how the session felt — it helps the plan fit you better.",
};

export default function CheckinPage() {
  return <CheckinView />;
}
