import { NextResponse } from "next/server";
import { requireStudent, handleApiError, ok } from "@/lib/api/server";
import { createCheckin } from "@/lib/services";
import { evaluateCheckin } from "@/lib/flagging";
import { listPosts, addPost, react, addReply, type CommunityPost } from "@/lib/store/community";

export const runtime = "nodejs";

// Anonymous but stable aliases — derived by hashing the student id, so a
// student always wears the same mask without ever exposing their name.
const ADJECTIVES = ["Calm", "Brave", "Curious", "Zen", "Steady", "Mindful", "Bright", "Gentle", "Resilient", "Swift"];
const NOUNS = ["Falcon", "Nova", "Comet", "Lynx", "Oak", "Aurora", "Pioneer", "Echo", "Atlas", "Breeze"];

function getStudentAlias(studentId: string): string {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = (hash << 5) - hash + studentId.charCodeAt(i);
    hash |= 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(hash >> 3) % NOUNS.length];
  const num = Math.abs(hash % 900) + 100;
  return `${adj} ${noun} #${num}`;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { student } = await requireStudent(req);
    const myAlias = getStudentAlias(student.id);
    const posts = listPosts().map((p) => ({ ...p, isMyPost: p.authorAlias === myAlias }));
    return ok({ posts, currentStudentAlias: myAlias, currentClass: student.class_level, currentBoard: student.board });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { student } = await requireStudent(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const myAlias = getStudentAlias(student.id);

    if (action === "create_post") {
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
      const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
      const category = body.category === "support" || body.category === "tip" ? body.category : "doubt";
      if (!title || !content) {
        return NextResponse.json({ error: "Please provide both a title and your thoughts." }, { status: 400 });
      }

      // Distress in a post is quietly surfaced to the counsellor — the student
      // is never told off, a human simply checks in.
      const verdict = evaluateCheckin(`${title} ${content}`, "😔", 0);
      if (verdict.flagged) {
        try {
          await createCheckin(student.id, "😔", `[Safe Haven Anonymous Post Alert]: ${verdict.reason ?? "Distress detected in peer post"}`);
        } catch (e) {
          console.error("Failed to flag counsellor:", e);
        }
      }

      const post: CommunityPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category,
        title,
        content,
        authorAlias: myAlias,
        authorClass: student.class_level,
        authorBoard: student.board,
        createdAt: new Date().toISOString(),
        reactions: { support: 1, break: 0, sameHere: 0, helped: 0 },
        replies: [],
      };
      addPost(post);
      return ok({ success: true, post: { ...post, isMyPost: true } });
    }

    if (action === "react") {
      const postId = String(body.postId ?? "");
      const kind = String(body.reactionType ?? "");
      if (!["support", "break", "sameHere", "helped"].includes(kind)) {
        return NextResponse.json({ error: "Unknown reaction." }, { status: 400 });
      }
      const reactions = react(postId, kind as keyof CommunityPost["reactions"]);
      if (!reactions) return NextResponse.json({ error: "Post not found." }, { status: 404 });
      return ok({ success: true, reactions });
    }

    if (action === "reply") {
      const postId = String(body.postId ?? "");
      const content = typeof body.content === "string" ? body.content.trim().slice(0, 1200) : "";
      if (!postId || !content) {
        return NextResponse.json({ error: "That reply didn't come through. Try again." }, { status: 400 });
      }
      const reply = addReply(postId, {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        authorAlias: myAlias,
        content,
        createdAt: new Date().toISOString(),
      });
      if (!reply) return NextResponse.json({ error: "Post not found." }, { status: 404 });
      return ok({ success: true, reply });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return handleApiError(e);
  }
}
