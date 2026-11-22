import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { GOOGLE } from "./config";

/**
 * The Google refresh token is the key to your calendar, so it is stored encrypted (AES-256-GCM).
 * The key comes from GOOGLE_TOKEN_KEY, which only the server has. A copy of the database row is useless without it.
 */
const key = (secret = GOOGLE.tokenKey()) => createHash("sha256").update(secret).digest();

export function encrypt(plain: string, secret?: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(token: string, secret?: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unreadable token");
  const d = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

/** A short random string for the sign-in `state` and the PKCE verifier. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** PKCE: the challenge Google gets is the hash of a secret only this server knows until the callback. */
export const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

/** Signs a value so a cookie can be trusted when it comes back. */
export function sign(value: string, secret = GOOGLE.tokenKey()): string {
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64url")}`;
}

export function unsign(signed: string, secret = GOOGLE.tokenKey()): string | null {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const want = Buffer.from(sign(value, secret));
  const got = Buffer.from(signed);
  return want.length === got.length && timingSafeEqual(want, got) ? value : null;
}
