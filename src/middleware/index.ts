import { defineMiddleware } from "astro:middleware";

import { supabaseClient, createSupabaseServerInstance } from "../db/supabase.client";

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
  // 1. Inject legacy Supabase client (kept for backward compatibility)
  context.locals.supabase = supabaseClient;

  const { url, cookies, redirect, request } = context;
  const pathname = new URL(url).pathname;

  // 2. Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));

  if (isPublicRoute) {
    return next();
  }

  // 3. Create SSR-enabled Supabase client for auth validation
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  // 4. Validate session with Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Invalid or missing session, redirect to login
    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // 5. Inject authenticated user into context
  context.locals.user = {
    id: user.id,
    email: user.email!,
    createdAt: user.created_at,
  };

  return next();
});
