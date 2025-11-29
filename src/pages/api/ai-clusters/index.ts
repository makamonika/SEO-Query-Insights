import type { APIRoute } from "astro";
import type { ErrorResponse, AiClusterSuggestionDto } from "@/types";
import { ClusterGeneratorService } from "@/lib/services/ai-clusters";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "@/lib/auth/utils";
import { OpenRouterError, OpenRouterErrorCode } from "@/lib/services/openrouter.service";

export const prerender = false;

/**
 * Map OpenRouter error codes to API error response codes
 * Follows Astro best practices: structured error handling, early returns
 */
function mapOpenRouterErrorToApiError(error: OpenRouterError): {
  code: ErrorResponse["error"]["code"];
  status: number;
} {
  switch (error.code) {
    case OpenRouterErrorCode.RATE_LIMIT_ERROR:
      return { code: "rate_limited", status: 429 };
    case OpenRouterErrorCode.AUTHENTICATION_ERROR:
      return { code: "unauthorized", status: 401 };
    case OpenRouterErrorCode.TIMEOUT_ERROR:
      return { code: "internal", status: 504 };
    case OpenRouterErrorCode.NETWORK_ERROR:
    case OpenRouterErrorCode.SERVER_ERROR:
      return { code: "internal", status: 503 };
    case OpenRouterErrorCode.VALIDATION_ERROR:
      return { code: "validation_error", status: 400 };
    default:
      return { code: "internal", status: 500 };
  }
}

export const GET: APIRoute = async ({ locals }) => {
  // Early return for authentication errors
  let userId: string;
  try {
    userId = requireUser(locals).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return buildUnauthorizedResponse(error.message);
    }
    throw error;
  }

  try {
    const clusters = await ClusterGeneratorService.generateClusters(locals.supabase, userId);

    return new Response(JSON.stringify(clusters satisfies AiClusterSuggestionDto[]), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store", // Prevent caching of compute-heavy AI responses
      },
    });
  } catch (error) {
    // Handle OpenRouter errors with structured responses
    if (error instanceof OpenRouterError) {
      const { code, status } = mapOpenRouterErrorToApiError(error);
      const errorResponse: ErrorResponse = {
        error: {
          code,
          message: error.userMessage,
          details: {
            originalCode: error.code,
            statusCode: error.statusCode,
            retryable: error.retryable,
          },
        },
      };

      console.error(`[ai-clusters][GET] OpenRouter error:`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });

      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle other errors
    console.error("[ai-clusters][GET] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: error instanceof Error ? error.message : "Failed to generate clusters",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
