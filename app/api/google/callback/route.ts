import { NextResponse, type NextRequest } from "next/server";
import { emailFromIdToken, exchangeCode } from "@/lib/google/api";
import { OAUTH_COOKIE, REQUIRED_SCOPES, googleConfigured } from "@/lib/google/config";
import { saveConnection } from "@/lib/google/connection";
import { unsign } from "@/lib/google/crypto";
import { currentUser } from "@/lib/google/session";

/** Google sends the browser back here after the consent screen. */
export async function GET(req: NextRequest) {
  const done = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/calendar?google=${reason}`, req.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/google" });
    return res;
  };
  if (!googleConfigured()) return done("not_configured");

  const q = req.nextUrl.searchParams;
  if (q.get("error")) return done(q.get("error") === "access_denied" ? "denied" : "error");

  // The state we sent must come back unchanged, and only the browser that started this holds the cookie.
  const saved = unsign(req.cookies.get(OAUTH_COOKIE)?.value ?? "");
  let pending: { state: string; verifier: string } | null = null;
  try {
    pending = saved ? JSON.parse(Buffer.from(saved, "base64url").toString("utf8")) : null;
  } catch {
    pending = null;
  }
  const code = q.get("code");
  if (!pending || !code || q.get("state") !== pending.state) return done("error");

  const session = await currentUser();
  if (!session) return NextResponse.redirect(new URL("/", req.url));

  try {
    const token = await exchangeCode(code, pending.verifier, `${req.nextUrl.origin}/api/google/callback`);
    // People can untick permissions on Google's screen; the app needs all three to work.
    const granted = (token.scope ?? "").split(" ");
    if (!REQUIRED_SCOPES.every((s) => granted.includes(s))) return done("missing_permission");
    if (!token.refresh_token) return done("error");
    await saveConnection(session.sb, session.user.id, emailFromIdToken(token.id_token), token.refresh_token, token.scope ?? "");
    return done("connected");
  } catch (e) {
    console.error("Google connect failed:", e instanceof Error ? e.message : e);
    return done("error");
  }
}
