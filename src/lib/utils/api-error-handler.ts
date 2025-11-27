import type { ErrorResponse } from "@/types";
import { toast } from "sonner";

/**
 * Standard API error handler for client-side API calls
 * Handles common HTTP error codes and displays appropriate toast messages
 */
export async function handleAPIError(
  response: Response,
  operation: string
): Promise<{ handled: boolean; message: string }> {
  // Handle authentication errors
  if (response.status === 401) {
    toast.error("Authentication required", {
      description: "Redirecting to login...",
    });
    setTimeout(() => {
      window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
    }, 1000);
    return { handled: true, message: "Authentication required" };
  }

  // Handle conflict errors (e.g., duplicate names)
  if (response.status === 409) {
    try {
      const errorData: ErrorResponse = await response.json();
      const message = errorData.error?.message || "A conflict occurred";
      return { handled: true, message };
    } catch {
      return { handled: true, message: "A conflict occurred" };
    }
  }

  // Handle validation errors
  if (response.status === 400) {
    try {
      const errorData: ErrorResponse = await response.json();
      const message = errorData.error?.message || "Invalid data provided";
      return { handled: true, message };
    } catch {
      return { handled: true, message: "Invalid data provided" };
    }
  }

  // Handle not found errors
  if (response.status === 404) {
    return { handled: true, message: "Resource not found" };
  }

  // Handle server errors
  if (response.status >= 500) {
    return { handled: true, message: "Server error occurred" };
  }

  // Generic error
  return {
    handled: false,
    message: `Failed to ${operation}: ${response.statusText}`,
  };
}

/**
 * Parse error response body safely
 */
export async function parseErrorResponse(response: Response): Promise<ErrorResponse | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Show error toast with consistent formatting
 */
export function showErrorToast(title: string, message: string): void {
  toast.error(title, {
    description: message,
  });
}

/**
 * Show success toast with consistent formatting
 */
export function showSuccessToast(title: string, message?: string): void {
  toast.success(title, {
    description: message,
  });
}
