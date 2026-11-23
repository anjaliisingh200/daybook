import { supabase } from "../supabase";

/** Stands in for the website's browser Supabase client (lib/supabase/browser.ts): the same client, with its login kept in extension storage. */
export function supabaseBrowser() {
  return supabase();
}
