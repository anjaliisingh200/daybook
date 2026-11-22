import { googleConfigured } from "@/lib/google/config";
import { readConnection } from "@/lib/google/connection";
import { currentUser, json } from "@/lib/google/session";

/** Is Google set up on this server, and is this user connected? Never returns the token. */
export async function GET() {
  const configured = googleConfigured();
  const session = await currentUser();
  if (!session) return json({ configured, connected: false, email: null });
  try {
    const c = configured ? await readConnection(session.sb) : null;
    return json({ configured, connected: !!c, email: c?.email ?? null });
  } catch (e) {
    // most likely the google_connections table has not been created yet (see supabase/schema.sql)
    console.error("Google status failed:", e instanceof Error ? e.message : e);
    return json({ configured, connected: false, email: null, error: "TABLE_MISSING" });
  }
}
