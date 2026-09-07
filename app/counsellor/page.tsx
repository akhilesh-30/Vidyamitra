import type { Metadata } from "next";
import { CounsellorConsole } from "@/components/counsellor/console";

export const metadata: Metadata = {
  title: "Counsellor console",
  description: "Escalations and class wellbeing for school counsellors.",
};

export default function CounsellorPage() {
  return <CounsellorConsole />;
}
