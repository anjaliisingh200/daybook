import { GoogleAuthError, accessTokenFor } from "@/lib/google/api";
import { googleConfigured } from "@/lib/google/config";
import { readConnection } from "@/lib/google/connection";
import { currentUser, json } from "@/lib/google/session";
import { googleSnapshot } from "@/lib/google/snapshot";

/** Everything the app shows (calendars, events, task lists, tasks), read from Google for the signed-in user. */
export async function GET() {
  if (!googleConfigured()) return json({ error: "NOT_CONFIGURED" }, 503);
  const session = await currentUser();
  if (!session) return json({ error: "SIGNED_OUT" }, 401);
  try {
    const c = await readConnection(session.sb);
    if (!c) return json({ error: "NOT_CONNECTED" }, 404);
    const token = await accessTokenFor(c.refreshToken);
    return json(await googleSnapshot(token));
  } catch (e) {
    if (e instanceof GoogleAuthError) return json({ error: "AUTH_EXPIRED" }, 401);
    console.error("Google snapshot failed:", e instanceof Error ? e.message : e);
    return json({ error: "GOOGLE_ERROR", message: e instanceof Error ? e.message : "Google did not answer" }, 502);
  }
}
