import "server-only";

/**
 * Thin Groq client (OpenAI-compatible chat completions).
 * Server-only: the API key never reaches the browser.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/** Good balance of quality & speed for study help. */
export const GROQ_MODEL = "llama-3.3-70b-versatile";
/** Fast/cheap model for short structured tasks. */
export const GROQ_FAST_MODEL = "llama-3.1-8b-instant";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

export async function groqChat(messages: ChatMessage[], opts: GroqOptions = {}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured on the server.");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model ?? GROQ_MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 1400,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/** Parse a JSON object out of a model reply, tolerating fences/prose. */
export function parseJsonLoose<T>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ---- tiny per-user rate limiter (in-memory; resets on restart) ---- */
const buckets = new Map<string, number[]>();

export function rateLimit(userId: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    buckets.set(userId, list);
    return false;
  }
  list.push(now);
  buckets.set(userId, list);
  return true;
}
