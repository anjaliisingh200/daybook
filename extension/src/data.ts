import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SignedOutError } from "./errors";
import { supabase } from "./supabase";

export { SignedOutError };

export interface Account {
  id: string;
  email: string;
}

/** Who is logged in, or null. Without Supabase keys (the demo build) the panel runs on sample data with no login. */
export async function currentAccount(): Promise<Account | null> {
  if (!isSupabaseConfigured) return { id: "demo", email: "anjali@example.com" };
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? "" } : null;
}

export async function signIn(email: string, password: string): Promise<Account> {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message === "Failed to fetch" ? "Couldn't reach the server. Check your connection and try again." : "That email and password don't match. Try again.");
  }
  return { id: data.user.id, email: data.user.email ?? email };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) await supabase().auth.signOut();
}
