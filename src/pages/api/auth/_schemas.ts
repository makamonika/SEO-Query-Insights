/**
 * Zod Validation Schemas for Authentication API
 *
 * All auth endpoint request validation schemas.
 */

import { z } from "zod";

/**
 * Registration schema
 */
export const registerSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
