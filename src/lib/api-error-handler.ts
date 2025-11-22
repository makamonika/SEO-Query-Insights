import type { ErrorResponse } from "@/types";

/**
 * Parse error response from API
 * Follows React best practices: extract logic into helpers
 */
export async function parseErrorResponse(response: Response): Promise<ErrorResponse | null> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get user-friendly error message from error response
 */
export function getErrorMessage(errorResponse: ErrorResponse | null, fallback: string): string {
  if (!errorResponse?.error) {
    return fallback;
  }

  // Use the message from API if available
  return errorResponse.error.message || fallback;
}
