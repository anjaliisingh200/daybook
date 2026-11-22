import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "./crypto";

/** The one saved Google connection per user (table `google_connections`, see supabase/schema.sql). */
export interface Connection {
  email: string | null;
  refreshToken: string;
}

export async function readConnection(sb: SupabaseClient): Promise<Connection | null> {
  const { data, error } = await sb.from("google_connections").select("email, refresh_token").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  try {
    return { email: data.email as string | null, refreshToken: decrypt(data.refresh_token as string) };
  } catch {
    return null; // saved with a different key: treat as not connected so the user can connect again
  }
}

export async function saveConnection(sb: SupabaseClient, userId: string, email: string | null, refreshToken: string, scope: string): Promise<void> {
  const { error } = await sb.from("google_connections").upsert({ user_id: userId, email, refresh_token: encrypt(refreshToken), scope, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function deleteConnection(sb: SupabaseClient): Promise<void> {
  const { error } = await sb.from("google_connections").delete().not("user_id", "is", null);
  if (error) throw new Error(error.message);
}
