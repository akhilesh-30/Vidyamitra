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
