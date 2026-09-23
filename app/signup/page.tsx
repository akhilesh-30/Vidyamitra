import type { Metadata } from "next";
import AuthScreen from "@/components/auth-screen";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return <AuthScreen mode="signup" />;
}
