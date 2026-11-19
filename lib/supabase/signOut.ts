import { supabaseBrowser } from "./browser";

/** Ends the session, then does a full page load so no one's data stays in memory. */
export async function signOut(): Promise<void> {
  await supabaseBrowser().auth.signOut();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${window.location.origin}/`);
}
