import type { ReactNode } from "react";
import { Wordmark } from "@/components/controls";

export function AuthScreen({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="ruled-page grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark large />
          <p className="text-[0.85rem] text-steel">a calmer way to keep up with class</p>
        </div>
        <div className="note-card p-6 sm:p-8">{children}</div>
        {aside ? <div className="mt-5 text-center text-sm text-steel">{aside}</div> : null}
      </div>
    </div>
  );
}
