/**
 * Session Management Utilities
 *
 * Centralized cookie management for authentication sessions.
 * Uses HTTP-only cookies for security.
 */

import type { AstroCookies } from "astro";
import type { Session } from "@supabase/supabase-js";

/**
 * Cookie attributes for access token
 * Short-lived token for authentication
 */
const ACCESS_TOKEN_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 3600, // 1 hour
};

/**
 * Cookie attributes for refresh token
 * Long-lived token for session renewal
 */
const REFRESH_TOKEN_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 1 week
};

/**
 * Set authentication cookies from Supabase session
 */
export function setAuthCookies(cookies: AstroCookies, session: Session): void {
  cookies.set("sb-access-token", session.access_token, ACCESS_TOKEN_OPTIONS);
  cookies.set("sb-refresh-token", session.refresh_token, REFRESH_TOKEN_OPTIONS);
}

/**
 * Clear authentication cookies (for logout)
 */
export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
}

/**
 * Get session tokens from cookies
 */
export function getSessionFromCookies(cookies: AstroCookies): {
  accessToken: string;
  refreshToken: string;
} | null {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}
