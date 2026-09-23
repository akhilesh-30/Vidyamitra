"use client";

/* Community — a calm, moderated feed. Students share wins, doubts and study
   circles; flagged posts are hidden server-side by counsellor moderation. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Send, Sparkles, Users } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type Raw = Record<string, unknown>;

interface Post {
  id: string; kind: string; title: string | null; body: string;
  author: string; school: string | null; at: string | null;
  reactions: number; replies: number;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Tolerant: the API may wrap the list in { posts } or return it bare. */
function toPosts(raw: unknown): Post[] {
  let list: Raw[] = [];
  if (Array.isArray(raw)) list = raw as Raw[];
  else if (raw && typeof raw === "object") {
    const o = raw as Raw;
    for (const k of ["posts", "items", "feed", "data"]) if (Array.isArray(o[k])) { list = o[k] as Raw[]; break; }
  }
  return list
    .map((p, i): Post | null => {
      const body = s(p.body) || s(p.content) || s(p.text);
      if (!p.id && !body) return null;
      const r = p.reactions;
      const reactions = Array.isArray(r)
        ? r.length
        : r && typeof r === "object"
          ? Object.values(r as Raw).reduce((a, v) => a + n(v), 0)
          : 0;
      return {
        id: s(p.id) || `p${i}`,
        kind: s(p.kind) || "post",
        title: s(p.title) || null,
        body,
        author: s(p.author_name) || s(p.author) || s(p.name) || "A student",
        school: s(p.school) || null,
        at: s(p.created_at) || null,
        reactions,
        replies: n(p.reply_count),
      };
    })
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

const KINDS: Record<string, string> = { post: "Journal", event: "Study circle", win: "Win", doubt: "Doubt", "study-buddy": "Study buddy" };
const kindLabel = (k: string) => KINDS[k] ?? k.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
