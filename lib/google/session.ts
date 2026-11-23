import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "../supabase/config";
import { supabaseServer } from "../supabase/server";

/** The token in an "Authorization: Bearer <token>" header, or null. */
export function bearerOf(header: string | null): string | null {
  const m = /^Bearer\s+([^\s]+)\s*$/i.exec(header ?? "");
  return m ? m[1] : null;
}

/**
 * The signed-in Daybook user for a route handler, or null. Google needs a Daybook account to hang the connection on.
 * The website proves who it is with its login cookie. The Chrome extension has no cookie, so it sends its
 * Daybook login token in the Authorization header instead; Supabase checks that token, and row-level security
 * applies to everything read with it exactly as it does for the cookie.
 */
export async function currentUser() {
  if (!isSupabaseConfigured) return null;
  const token = bearerOf((await headers()).get("authorization"));
  if (token) {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await sb.auth.getUser(token);
    return data.user ? { sb, user: data.user } : null;
  }
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ? { sb, user: data.user } : null;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Changing requests must come from this site's own pages. */
export function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}
