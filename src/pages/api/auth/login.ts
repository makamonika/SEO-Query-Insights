/**
 * POST /api/auth/login
 *
 * Authenticate user with email and password
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { loginUser } from "@/lib/auth/auth.service";
import { setAuthCookies } from "@/lib/auth/session";
import { loginSchema } from "./_schemas";
import type { ErrorResponse } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: validation.error.errors[0]?.message || "Invalid request data",
          details: { errors: validation.error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = validation.data;

    // Create Supabase server instance
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    // Attempt login
    const result = await loginUser(supabase, email, password);

    if ("error" in result) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "unauthorized",
          message: "Invalid email or password",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Set authentication cookies
    setAuthCookies(cookies, result.session);

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
    console.error("Login error:", error);
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
