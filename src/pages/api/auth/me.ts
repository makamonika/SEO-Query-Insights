/**
 * GET /api/auth/me
 *
 * Get current authenticated user
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { getCurrentUser } from "@/lib/auth/service";
import type { ErrorResponse } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server instance
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    // Get current user
    const result = await getCurrentUser(supabase);

    if ("error" in result) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "unauthorized",
          message: "Not authenticated",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return user data
    return new Response(
      JSON.stringify({
        user: result.user,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Get user error:", error);
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
