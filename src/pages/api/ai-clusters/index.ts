import type { APIRoute } from "astro";
import type { ErrorResponse, AiClusterSuggestionDto } from "../../../types";
import { generateClusters } from "../../../lib/ai-clusters/service";

export const prerender = false;
/**
 * GET /api/ai-clusters
 * Generates AI clustering suggestions on-demand and returns them to the client.
 * Suggestions are stateless and not persisted server-side.
 *
 * Response: Array of AiClusterSuggestionDto
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */

export const GET: APIRoute = async ({ locals }) => {
  // TODO: Replace with real auth once available
  const userId = "76d5ed57-8598-4b97-9c1e-4dac1e1c74ce";

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
