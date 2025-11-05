/**
 * POST /api/auth/logout
 *
 * Sign out current user and clear session
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logoutUser } from "@/lib/auth/service";
import { clearAuthCookies } from "@/lib/auth/session";
import type { ErrorResponse } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server instance
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    // Attempt logout
    const result = await logoutUser(supabase);

    // Clear cookies regardless of logout result
    clearAuthCookies(cookies);

    if (!result.success) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "internal",
          message: result.error || "Failed to log out",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return success
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Logout error:", error);

    // Clear cookies even on error
    clearAuthCookies(cookies);

    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
