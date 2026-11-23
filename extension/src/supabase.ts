import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Keeps the login in the extension's own storage (the website keeps it in cookies, which an extension does not share). */
const chromeStorage = {
  async getItem(key: string): Promise<string | null> {
    const got = await chrome.storage.local.get(key);
    return (got[key] as string | undefined) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  },
};

let client: SupabaseClient | null = null;

/** The one Supabase client for the panel. It signs in with email and password, refreshes the login by itself and survives closing the panel. */
export function supabase(): SupabaseClient {
  client ??= createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
    auth: { storage: chromeStorage, storageKey: "daybook.extension.auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
