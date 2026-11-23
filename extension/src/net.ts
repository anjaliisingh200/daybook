import { supabase } from "./supabase";

/**
 * The website's code asks its own server for Google data with addresses like "/api/google/status".
 * Inside the extension that address means nothing, so those calls go to the Daybook site instead,
 * proving who we are with the Supabase login (the website uses its cookie).
 */
export function routeGoogleCallsToTheSite(): void {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("/api/google/")) return real(input, init);
    const { data } = await supabase().auth.getSession();
    const headers = new Headers(init?.headers);
    if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return real(`${__SITE_URL__}${url}`, { ...init, headers });
  };
}
