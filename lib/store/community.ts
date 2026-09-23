import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * File-backed community store. The previous implementation kept everything in
 * memory, so every dev-server restart silently erased students' posts. This
 * store persists to .data/community.json (git-ignored) and survives restarts.
 * Single-process safe (dev / self-hosted `next start`).
 */

export interface CommunityReply {
  id: string;
  authorAlias: string;
  content: string;
  createdAt: string;
  isAi?: boolean;
}

export interface CommunityPost {
  id: string;
  category: "doubt" | "support" | "tip";
  title: string;
  content: string;
  authorAlias: string;
  authorClass: number;
  authorBoard: string;
  createdAt: string;
  reactions: { support: number; break: number; sameHere: number; helped: number };
  replies: CommunityReply[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "community.json");

function load(): CommunityPost[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as CommunityPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(posts: CommunityPost[]): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 1), "utf8");
  } catch (e) {
    console.error("Community store write failed:", e);
  }
}

export function listPosts(): CommunityPost[] {
  return load();
}

export function addPost(post: CommunityPost): void {
  const posts = load();
  posts.unshift(post);
  // keep the feed light — most recent 300 posts
  save(posts.slice(0, 300));
}

export function react(postId: string, kind: keyof CommunityPost["reactions"]): CommunityPost["reactions"] | null {
  const posts = load();
  const post = posts.find((p) => p.id === postId);
  if (!post) return null;
  post.reactions[kind] = (post.reactions[kind] ?? 0) + 1;
  save(posts);
  return post.reactions;
}

export function addReply(postId: string, reply: CommunityReply): CommunityReply | null {
  const posts = load();
  const post = posts.find((p) => p.id === postId);
  if (!post) return null;
  post.replies.push(reply);
  save(posts);
  return reply;
}