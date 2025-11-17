import type { AstroCookies } from "astro";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Create a basic Supabase client (for non-SSR contexts)
 * @deprecated Use createSupabaseServerInstance for SSR contexts
 */
export const createSupabaseClient = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY);
};

// Cookie options for authentication
export const getCookieOptions = (isProduction: boolean): CookieOptionsWithName => ({
  path: "/",
  secure: isProduction,
  httpOnly: true,
  sameSite: "lax",
});

/**
 * Parse cookie header string into array of cookie objects
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server client with SSR support
 * This client properly handles authentication cookies for server-side rendering
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  // Use import.meta.env.PROD to determine if we're in production
  // This is a default Astro environment variable
  const cookieOptions = getCookieOptions(import.meta.env.PROD);

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
