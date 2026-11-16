"use client";

/* Lily Ai — the study companion. Streams answers token-by-token from /api/mitra.
   The route replies with plain text, so chunks are appended verbatim; if a
   response ever arrives as SSE frames (text/event-stream) those are decoded too. */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui";
import { apiStream } from "@/lib/api/client";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const NAME = "Lily Ai";

const GREETING: ChatMsg = {
  role: "assistant",
  content: `Hi, I'm ${NAME}. Ask me anything from your syllabus, or just tell me how today is going — I'll keep it simple and kind.`,
};

const STARTERS = [
  "Explain photosynthesis like I'm 12",
  "Give me 3 practice questions on linear equations",
  "I have a test tomorrow — make me a quick revision plan",
  "How do I stop panicking before exams?",
];

/** Pull the assistant text out of one SSE `data:` frame, tolerating odd shapes. */
function textFromSSE(payload: string): string {
  if (!payload || payload === "[DONE]") return "";
  try {
    const json = JSON.parse(payload) as { choices?: { delta?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.delta?.content;
    if (typeof content === "string") return content;
    if (content && typeof content === "object") {
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    }
    return "";
  } catch {
    return payload; // plain text frame
  }
}

export default function LilyAiPage() {
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

    const showReply = (value: string, error = false) =>
      setMessages((ms) => {
        const copy = [...ms];
        copy[copy.length - 1] = { role: "assistant", content: value, error };
        return copy;
      });

    try {
      const res = await apiStream("/api/mitra", { message: trimmed, history });
      if (!res.body) throw new Error(`${NAME} sent an empty reply. Try once more?`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const isSSE = (res.headers.get("content-type") ?? "").includes("text/event-stream");

      let acc = "";
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (!isSSE) {
          // Plain-text stream: append exactly what arrived so words appear as typed.
          acc += buffer;
          buffer = "";
          showReply(acc);
          continue;
        }

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          for (const line of frame.split("\n")) {
            const line2 = line.trim();
            if (!line2.startsWith("data:")) continue;
            acc += textFromSSE(line2.slice(5).trim());
          }
          showReply(acc);
        }
      }

      // Anything left without a trailing separator.
      if (isSSE && buffer) {
        for (const line of buffer.split("\n")) {
          const t = line.trim();
          if (t.startsWith("data:")) acc += textFromSSE(t.slice(5).trim());
        }
        showReply(acc);
      }

      if (!acc.trim()) showReply(`That came back empty — ask me once more?`, true);
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : "Something went wrong. Try again.";
      showReply(msg, true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-120px)] w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <SectionHeading
        title={NAME}
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
            placeholder={`Ask ${NAME} anything…`}
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
