import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/** Pages that need a signed-in user. The home page and assets stay open. */
const PROTECTED = ["/calendar", "/tasks", "/design-system"];

/** Keeps the session cookie fresh and sends signed-out visitors to the home page. Does nothing without Supabase keys. */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && isProtected) {
    const to = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((c) => to.cookies.set(c));
    return to;
  }
  if (user && (path === "/" || path === "/login")) {
    const to = NextResponse.redirect(new URL("/calendar", request.url));
    response.cookies.getAll().forEach((c) => to.cookies.set(c));
    return to;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
