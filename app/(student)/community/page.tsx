"use client";

/* Unburden — an anonymous, moderated peer space. Every student wears a stable
   mask derived server-side from their id, so the same person stays
   recognisable without ever being identifiable. Distress in a post quietly
   reaches the counsellor; the student is never scolded for it. */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Heart, Loader2, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Empty, ErrorNote, SectionHeading, Spinner } from "@/components/ui";

interface Reply {
  id: string;
  authorAlias: string;
  content: string;
  createdAt: string;
  isAi?: boolean;
}

interface Reactions {
  support: number;
  break: number;
  sameHere: number;
  helped: number;
}

type ReactionKey = keyof Reactions;

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  authorAlias: string;
  authorClass: number;
  authorBoard: string;
  createdAt: string;
  reactions: Reactions;
  replies: Reply[];
  isMyPost?: boolean;
}

interface Feed {
  posts: Post[];
  currentStudentAlias: string;
  currentClass: number;
  currentBoard: string;
}

const CATEGORIES = [
  { id: "doubt", label: "Doubt", hint: "Stuck on something from class" },
  { id: "support", label: "Need support", hint: "Something you want to say somewhere safe" },
  { id: "tip", label: "Study tip", hint: "Something that actually worked for you" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

const REACTIONS: { key: ReactionKey; label: string; icon: string }[] = [
  { key: "support", label: "Support", icon: "🫂" },
  { key: "sameHere", label: "Same here", icon: "🤝" },
  { key: "helped", label: "Helped me", icon: "💡" },
  { key: "break", label: "Take a break", icon: "🌿" },
];

const CATEGORY_LABEL: Record<string, string> = {
  doubt: "Doubt",
  support: "Support",
  tip: "Study tip",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export default function CommunityPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("doubt");
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [reacted, setReacted] = useState<Record<string, ReactionKey[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFeed(await apiFetch<Feed>("/api/community"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the community just now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c || posting) return;
    setPosting(true);
    setComposerError(null);
    try {
      await apiFetch("/api/community", {
        method: "POST",
        body: { action: "create_post", title: t, content: c, category },
      });
      setTitle("");
      setContent("");
      await load();
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : "Your post didn't go through. Try once more.");
    } finally {
      setPosting(false);
    }
  }

  async function react(postId: string, key: ReactionKey) {
    if (reacted[postId]?.includes(key)) return;
    try {
      const res = await apiFetch<{ reactions: Reactions }>("/api/community", {
        method: "POST",
        body: { action: "react", postId, reactionType: key },
      });
      setFeed((f) =>
        f ? { ...f, posts: f.posts.map((p) => (p.id === postId ? { ...p, reactions: res.reactions } : p)) } : f
      );
      setReacted((r) => ({ ...r, [postId]: [...(r[postId] ?? []), key] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That reaction didn't save.");
    }
  }

  async function sendReply(postId: string) {
    const text = (drafts[postId] ?? "").trim();
    if (!text || sendingReply) return;
    setSendingReply(postId);
    try {
      const res = await apiFetch<{ reply: Reply }>("/api/community", {
        method: "POST",
        body: { action: "reply", postId, content: text },
      });
      setFeed((f) =>
        f
          ? {
              ...f,
              posts: f.posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, res.reply] } : p)),
            }
          : f
      );
      setDrafts((d) => ({ ...d, [postId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That reply didn't save.");
    } finally {
      setSendingReply(null);
    }
  }

  if (loading && !feed) return <Spinner label="Opening the safe space…" />;

  const posts = feed?.posts ?? [];

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <span className="eyebrow">
          <span className="eyebrow-dot" /> Unburden
        </span>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Say it without your name</h1>
        <p className="muted mt-2 max-w-2xl text-[14px] leading-relaxed">
          Doubts, small wins, or the thing you can&apos;t say out loud. Your mask stays the same every time
          {feed?.currentStudentAlias ? (
            <>
              {" "}
              — today you are <span className="text-[var(--text-2)]">{feed.currentStudentAlias}</span>
            </>
          ) : null}
          . Kindness is the only rule.
        </p>
      </div>

      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      {/* composer */}
      <section className="card p-5">
        <SectionHeading title="Post something" hint="Read by classmates, watched over by your counsellor." />
        <form onSubmit={submitPost} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.hint}
                onClick={() => setCategory(c.id)}
                className={`btn btn-sm ${category === c.id ? "btn-primary" : "btn-ghost"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="A short title"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[96px] resize-y"
            placeholder="Write it here. No names, no photos, no phone numbers."
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {composerError ? <p className="field-error">{composerError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="faint flex max-w-sm items-start gap-1.5 text-[11.5px] leading-relaxed">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--sage)]" />
              If something sounds heavy, a counsellor is quietly told — never your classmates.
            </p>
            <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !title.trim() || !content.trim()}>
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Share anonymously
            </button>
          </div>
        </form>
      </section>

      {/* feed */}
      {posts.length === 0 ? (
        <Empty
          icon={<Sparkles size={20} />}
          title="Nothing here yet"
          text="Be the first to post. A doubt, a win, or something you learned today — it all helps someone."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const repliesOpen = Boolean(openReplies[post.id]);
            return (
              <article key={post.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-ember">{CATEGORY_LABEL[post.category] ?? "Post"}</span>
                  {post.title ? <span className="text-[15px] font-semibold">{post.title}</span> : null}
                  {post.isMyPost ? <span className="chip">yours</span> : null}
                </div>
                <p className="muted mt-2.5 whitespace-pre-wrap text-[13.5px] leading-relaxed">{post.content}</p>
                <p className="faint mt-3 text-[11.5px]">
                  {post.authorAlias} · Class {post.authorClass} · {timeAgo(post.createdAt)}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {REACTIONS.map((r) => {
                    const mine = reacted[post.id]?.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => void react(post.id, r.key)}
                        disabled={mine}
                        className={`chip cursor-pointer ${mine ? "chip-sage" : ""}`}
                        title={r.label}
                      >
                        <span aria-hidden="true">{r.icon}</span> {post.reactions[r.key] ?? 0}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="chip cursor-pointer"
                    onClick={() => setOpenReplies((o) => ({ ...o, [post.id]: !o[post.id] }))}
                  >
                    <MessageCircle size={13} /> {post.replies.length}
                  </button>
                </div>

                {repliesOpen ? (
                  <div className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-3.5">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="rounded-xl border border-[var(--line)] p-3">
                        <p className="muted text-[13px] leading-relaxed">{reply.content}</p>
                        <p className="faint mt-1 text-[11px]">
                          {reply.authorAlias} · {timeAgo(reply.createdAt)}
                        </p>
                      </div>
                    ))}
                    {post.replies.length === 0 ? (
                      <p className="faint text-[12.5px]">No replies yet — a kind sentence goes a long way.</p>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Reply kindly…"
                        maxLength={1200}
                        value={drafts[post.id] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void sendReply(post.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm shrink-0"
                        disabled={sendingReply === post.id || !(drafts[post.id] ?? "").trim()}
                        onClick={() => void sendReply(post.id)}
                      >
                        {sendingReply === post.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <p className="faint flex items-center justify-center gap-2 py-2 text-center text-[12px]">
        <Heart size={12} className="text-[var(--rose)]" /> In crisis? Tele-MANAS 14416 — free, 24×7.
      </p>
    </div>
  );
}
