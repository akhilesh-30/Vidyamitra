"use client";

import { getBrowserClient } from "@/lib/supabase/browser";

export class RequestError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown }
): Promise<T> {
  const sb = getBrowserClient();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    throw new RequestError("Your session has run out. Sign in again and you'll be right back.", 401, "UNAUTHENTICATED");
  }

  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  let payload: { data?: T; error?: { message?: string; code?: string } } | null = null;
  try {
    const json = (await res.json()) as { data?: T; error?: { message?: string; code?: string } };
    payload = json;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new RequestError(
      payload?.error?.message ?? "Something went wrong. Please try again in a moment.",
      res.status,
      payload?.error?.code
    );
  }
  return payload?.data as T;
}

/**
 * Same authentication as apiFetch, but hands back the raw Response so a caller
 * can read a streamed body (Lily Ai answers token-by-token).
 *
 * Errors are turned into a readable RequestError here: error bodies can be
 * JSON `{ error: { message } }`, JSON `{ error: "text" }`, or plain text, and
 * passing the raw object to `new Error()` is what produced `[object Object]`
 * on screen before.
 */
export async function apiStream(path: string, body: unknown): Promise<Response> {
  const sb = getBrowserClient();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    throw new RequestError("Your session has run out. Sign in again and you'll be right back.", 401, "UNAUTHENTICATED");
  }

  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.ok && res.body) return res;

  let message = "Something went wrong. Please try again in a moment.";
  let code: string | undefined;
  const raw = await res.text().catch(() => "");
  try {
    const json = JSON.parse(raw) as { error?: unknown };
    const err = json?.error;
    if (typeof err === "string") message = err;
    else if (err && typeof err === "object") {
      const obj = err as { message?: unknown; code?: unknown };
      if (typeof obj.message === "string" && obj.message) message = obj.message;
      if (typeof obj.code === "string") code = obj.code;
    } else if (raw.trim()) message = raw.trim().slice(0, 240);
  } catch {
    if (raw.trim()) message = raw.trim().slice(0, 240);
  }

  throw new RequestError(message, res.status, code);
}
