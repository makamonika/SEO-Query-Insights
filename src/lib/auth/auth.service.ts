/**
 * Authentication Service Layer
 *
 * Encapsulates Supabase Auth operations and provides consistent error handling
 * for authentication-related operations.
 */

import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { UserDto } from "@/types";

/**
 * Transform Supabase User to UserDto
 */
function mapUserToDto(user: User): UserDto {
  if (!user.email) {
    throw new Error("User email is required");
  }
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
  };
}

/**
 * Register a new user with email and password
 */
export async function registerUser(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ user: UserDto; session: Session } | { error: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user || !data.session) {
    return { error: "Failed to create user account" };
  }

  return {
    user: mapUserToDto(data.user),
    session: data.session,
  };
}

/**
 * Authenticate user with email and password
 */
export async function loginUser(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ user: UserDto; session: Session } | { error: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user || !data.session) {
    return { error: "Invalid credentials" };
  }

  return {
    user: mapUserToDto(data.user),
    session: data.session,
  };
}

/**
 * Sign out current user
 */
export async function logoutUser(supabase: SupabaseClient<Database>): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(
  supabase: SupabaseClient<Database>
): Promise<{ user: UserDto } | { error: string }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated" };
  }

  return { user: mapUserToDto(user) };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  supabase: SupabaseClient<Database>,
  email: string,
  redirectTo: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update user password (requires valid session with reset token)
 */
export async function resetPassword(
  supabase: SupabaseClient<Database>,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
