/**
 * POST /api/auth/forgot-password
 *
 * Initiate password reset flow by sending reset email
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { sendPasswordReset } from "@/lib/auth/auth.service";
import { forgotPasswordSchema } from "./_schemas";
import type { ErrorResponse, ForgotPasswordResponseDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

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

    const { email } = validation.data;

    // Create Supabase server instance
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    // Construct redirectTo URL for password reset
    // Supabase will append the token hash to this URL
    const url = new URL(request.url);
    const redirectTo = `${url.origin}/reset-password`;

    // Attempt to send password reset email
    const result = await sendPasswordReset(supabase, email, redirectTo);

    if (!result.success) {
      // Log error but don't reveal it to client (security best practice)
      console.error("Password reset error:", result.error);

      // Always return success to prevent email enumeration
      // This is a security best practice - don't reveal if email exists
      const response: ForgotPasswordResponseDto = {
        message: "If an account exists for this email, you will receive password reset instructions.",
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - always return generic message (security best practice)
    const response: ForgotPasswordResponseDto = {
      message: "If an account exists for this email, you will receive password reset instructions.",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // Even on unexpected errors, return generic success message
    // This prevents information leakage about system state
    const response: ForgotPasswordResponseDto = {
      message: "If an account exists for this email, you will receive password reset instructions.",
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
