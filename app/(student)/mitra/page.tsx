"use client";

/* Mitra — the study companion. Streams answers token-by-token from /api/mitra
   (Groq SSE with a plain-text fallback, so either wire format works). */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const GREETING: ChatMsg = {
  role: "assistant",
  content:
    "Hi, I'm Mitra. Ask me anything from your syllabus, or just tell me how today is going — I'll keep it simple and kind.",
};

const STARTERS = [
  "Explain photosynthesis like I'm 12",
  "Give me 3 practice questions on linear equations",
  "I have a test tomorrow — make me a quick revision plan",
  "How do I stop panicking before exams?",
];

export default function MitraPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10);

    setMessages((ms) => [...ms, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok || !res.body) {
        let msg = "Mitra is taking a moment to breathe. Try sending that again.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* non-JSON error body — keep the friendly default */
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          for (const line of ev.split("\n")) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let piece: string | null = null;
            try {
              const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              piece = j.choices?.[0]?.delta?.content ?? null;
            } catch {
              piece = payload; // plain-text stream fallback
            }
            if (piece) acc += piece;
            const snapshot = acc;
            setMessages((ms) => {
              const cp = [...ms];
              cp[cp.length - 1] = { role: "assistant", content: snapshot };
              return cp;
            });
          }
        }
      }

      if (!acc.trim()) {
        setMessages((ms) => {
          const cp = [...ms];
          cp[cp.length - 1] = { role: "assistant", content: "That came back empty — ask me once more?", error: true };
          return cp;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setMessages((ms) => {
        const cp = [...ms];
        cp[cp.length - 1] = { role: "assistant", content: msg, error: true };
        return cp;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-120px)] w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <SectionHeading
        title="Mitra"
        hint="Your study companion — explains, quizzes, and listens. Never judges."
      />

      <div className="card mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" ? (
                <span className="mr-2.5 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(240,178,90,0.14)] text-[var(--ember)]">
                  <Sparkles size={14} />
                </span>
              ) : null}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-md bg-[rgba(240,178,90,0.13)] px-4 py-2.5 text-[14px] leading-relaxed"
                    : m.error
                      ? "max-w-[85%] rounded-2xl rounded-bl-md border border-[rgba(224,139,139,0.35)] px-4 py-2.5 text-[14px] leading-relaxed text-[var(--rose)]"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--ink-2)] px-4 py-2.5 text-[14px] leading-relaxed"
                }
              >
                {m.content ||
                  (sending && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="orb-syn s1" style={{ width: 6, height: 6, display: "inline-block" }} />
                      <span className="orb-syn s2" style={{ width: 6, height: 6, display: "inline-block" }} />
                      <span className="orb-syn s3" style={{ width: 6, height: 6, display: "inline-block" }} />
                    </span>
                  ) : null)}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* starters */}
        {messages.length <= 1 && !sending ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip chip-ember cursor-pointer"
                onClick={() => void send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {/* composer */}
        <form
          className="flex items-center gap-2 border-t border-[var(--line)] p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            className="input flex-1"
            placeholder="Ask Mitra anything…"
            value={input}
            maxLength={1200}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm shrink-0"
            disabled={sending || !input.trim()}
            aria-label="Send message"
          >
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
