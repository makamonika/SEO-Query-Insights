/**
 * POST /api/auth/register
 *
 * Register a new user with email and password
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { registerUser } from "@/lib/auth/auth.service";
import { setAuthCookies } from "@/lib/auth/session";
import { registerSchema } from "./_schemas";
import type { ErrorResponse, RegisterResponseDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

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

    // Attempt registration
    const result = await registerUser(supabase, email, password);

    if ("error" in result) {
      // Check if it's a duplicate email error
      const isDuplicateEmail =
        result.error.toLowerCase().includes("already registered") ||
        result.error.toLowerCase().includes("already exists") ||
        result.error.toLowerCase().includes("duplicate");

      const errorResponse: ErrorResponse = {
        error: {
          code: isDuplicateEmail ? "conflict" : "validation_error",
          message: isDuplicateEmail ? "This email is already registered" : result.error,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: isDuplicateEmail ? 409 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Set authentication cookies
    setAuthCookies(cookies, result.session);

    // Check if email confirmation is required
    // When email confirmation is enabled in Supabase (auth.email.enable_confirmations = true),
    // the user will receive a confirmation email and won't be able to sign in until confirmed.
    // The session is still created, but the user's email_confirmed_at will be null.
    const requiresEmailConfirmation = !result.session.user.email_confirmed_at;

    // Return user data
    const response: RegisterResponseDto = {
      user: result.user,
      requiresEmailConfirmation,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Registration error:", error);
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
