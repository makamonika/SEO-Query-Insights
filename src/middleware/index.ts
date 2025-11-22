import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "@/db/supabase.client";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

// Assets and static files (always public)
const PUBLIC_PATTERNS = [/^\/favicon\.png$/, /^\/_astro\//, /^\/api\/health$/];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, request } = context;
  const pathname = new URL(url).pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));
  const isApiRoute = pathname.startsWith("/api/");

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  context.locals.supabase = supabase;

  // Skip authentication check for public routes
  if (isPublicRoute) {
    context.locals.user = undefined;
    return next();
  }

  // Only check authentication for protected routes
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[middleware] Failed to fetch authenticated user:", error.message);
  }

  if (user) {
    context.locals.user = {
      id: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
    };
  } else {
    context.locals.user = undefined;
  }

  if (!user) {
    if (isApiRoute) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return next();
});
