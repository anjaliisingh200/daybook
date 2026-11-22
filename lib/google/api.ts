import { GOOGLE } from "./config";

/** Google says the saved permission no longer works (revoked, expired, or the password changed). The user must connect again. */
export class GoogleAuthError extends Error {
  constructor(message = "Google needs to be connected again") {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export class GoogleHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GoogleHttpError";
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  expires_in?: number;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(GOOGLE.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE.clientId(), client_secret: GOOGLE.clientSecret(), ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new GoogleAuthError();
    throw new GoogleHttpError(res.status, json.error_description ?? json.error ?? "Google sign-in failed");
  }
  return json;
}

export const exchangeCode = (code: string, verifier: string, redirectUri: string) =>
  tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri });

/** Trades the saved refresh token for a one-hour access token. */
export async function accessTokenFor(refreshToken: string): Promise<string> {
  return (await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken })).access_token;
}

/** Tells Google to forget this permission. Best effort: the local copy is deleted either way. */
export async function revoke(token: string): Promise<void> {
  try {
    await fetch(GOOGLE.revokeUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }), cache: "no-store" });
  } catch {
    // Offline or Google is slow: nothing more to do.
  }
}

/** The email address inside the ID token. It came straight from Google over HTTPS, so it is not re-verified here. */
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    return payload.email ?? null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET from a Google API. Waits and retries when Google says to slow down. */
export async function gget<T>(accessToken: string, path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const url = new URL(GOOGLE.apiBase + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401) throw new GoogleAuthError();
    const detail = (await res.json().catch(() => ({}))) as { error?: { message?: string; errors?: { reason?: string }[] } };
    // 429/503 mean slow down; a 403 only does when the reason says so (otherwise it is a missing permission)
    const slow = res.status === 429 || res.status === 503 || (res.status === 403 && /ratelimit/i.test(detail.error?.errors?.[0]?.reason ?? ""));
    if (slow && attempt < 3) {
      await sleep(400 * 2 ** attempt + Math.random() * 200);
      continue;
    }
    throw new GoogleHttpError(res.status, detail.error?.message ?? `Google returned ${res.status}`);
  }
}
