import type { NextRequest } from "next/server";
import { isSupabaseConfigured } from "../supabase/config";
import { supabaseServer } from "../supabase/server";

/** The signed-in Daybook user for a route handler, or null. Google needs a Daybook account to hang the connection on. */
export async function currentUser() {
  if (!isSupabaseConfigured) return null;
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
