import type { NextRequest } from "next/server";
import { revoke } from "@/lib/google/api";
import { deleteConnection, readConnection } from "@/lib/google/connection";
import { currentUser, json, sameOrigin } from "@/lib/google/session";

/** Forgets the Google connection here and asks Google to cancel the permission. Daybook's own data is untouched. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "FORBIDDEN" }, 403);
  const session = await currentUser();
  if (!session) return json({ error: "SIGNED_OUT" }, 401);
  try {
    const c = await readConnection(session.sb);
    if (c) await revoke(c.refreshToken);
    await deleteConnection(session.sb);
    return json({ ok: true });
  } catch (e) {
    console.error("Google disconnect failed:", e instanceof Error ? e.message : e);
    return json({ error: "FAILED" }, 500);
  }
}
