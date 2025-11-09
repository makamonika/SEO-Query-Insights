import type { APIRoute } from "astro";
import type { ErrorResponse, AiClusterSuggestionDto } from "../../../types";
import { generateClusters } from "../../../lib/services/ai-clusters.service";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "../../../lib/auth/utils";

export const prerender = false;
export const GET: APIRoute = async ({ locals }) => {
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
    const clusters = await generateClusters(locals.supabase, userId);

    return new Response(JSON.stringify(clusters satisfies AiClusterSuggestionDto[]), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store", // Prevent caching of compute-heavy AI responses
      },
    });
  } catch (error) {
    console.error("[ai-clusters][GET] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to generate clusters",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
