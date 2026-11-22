import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE, OAUTH_COOKIE, SCOPES, googleConfigured } from "@/lib/google/config";
import { challengeOf, randomToken, sign } from "@/lib/google/crypto";
import { currentUser } from "@/lib/google/session";

/** Starts "Connect Google account": sends the browser to Google's consent screen. */
export async function GET(req: NextRequest) {
  const back = (reason: string) => NextResponse.redirect(new URL(`/calendar?google=${reason}`, req.url));
  if (!googleConfigured()) return back("not_configured");
  if (!(await currentUser())) return NextResponse.redirect(new URL("/", req.url));

  const state = randomToken();
  const verifier = randomToken(48);
  const url = new URL(GOOGLE.authUrl);
  url.search = new URLSearchParams({
    client_id: GOOGLE.clientId(),
    redirect_uri: `${req.nextUrl.origin}/api/google/callback`,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: challengeOf(verifier),
    code_challenge_method: "S256",
    access_type: "offline", // asks for a refresh token, so the connection outlives one hour
    prompt: "consent", // makes Google send that token again if this account connected before
    include_granted_scopes: "true",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, sign(Buffer.from(JSON.stringify({ state, verifier })).toString("base64url")), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}
