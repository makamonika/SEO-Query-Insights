import { useState, useCallback } from "react";
import type {
  LoginFormData,
  RegisterFormData,
  ResetPasswordFormData,
  ForgotPasswordFormData,
} from "@/lib/validation/auth";

interface UseAuthMutationResult<TData> {
  mutate: (data: TData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface UseRegisterResult extends UseAuthMutationResult<RegisterFormData> {
  success: string | null;
}

/**
 * Custom hook for login API call
 */
export function useLogin(): UseAuthMutationResult<LoginFormData> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: "same-origin",
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error?.message || "Invalid email or password");
      }

      // Success - redirect to home or specified redirect URL
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect") || "/";
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      setIsLoading(false);
      throw err;
    }
  }, []);

  return { mutate, isLoading, error };
}

/**
 * Custom hook for registration API call
 */
export function useRegister(): UseRegisterResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutate = useCallback(async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        if (response.status === 409) {
          throw new Error("This email is already registered");
        }
        throw new Error(responseData.error?.message || "Registration failed. Please try again.");
      }

      const responseData = await response.json();

      // Check if email confirmation is required
      if (responseData.requiresEmailConfirmation) {
        setSuccess("Account created successfully! Please check your email to confirm your account before signing in.");
        setIsLoading(false);
      } else {
        // Success - reload page to trigger middleware redirect
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      setIsLoading(false);
      throw err;
    }
  }, []);

  return { mutate, isLoading, error, success };
}

/**
 * Custom hook for password reset API call
 */
export function useResetPassword(token: string): UseAuthMutationResult<ResetPasswordFormData> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: ResetPasswordFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password: data.password,
            confirmPassword: data.confirmPassword,
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          if (response.status === 400) {
            throw new Error("This reset link is invalid or expired. Please request a new one.");
          }
          throw new Error(responseData.error?.message || "Failed to reset password. Please try again.");
        }

        // Success - redirect to login with success message
        window.location.href = "/login?reset=success";
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
        setIsLoading(false);
        throw err;
      }
    },
    [token]
  );

  return { mutate, isLoading, error };
}

/**
 * Custom hook for forgot password API call
 */
export function useForgotPassword(): UseAuthMutationResult<ForgotPasswordFormData> & { success: boolean } {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutate = useCallback(async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error?.message || "Failed to send reset email. Please try again.");
      }

      // Success - show success message
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error, success };
}
