import type { APIRoute } from "astro";
import type { ErrorResponse, AiClusterSuggestionDto } from "../../../types";
import { generateClusters } from "../../../lib/ai-clusters/service";

export const prerender = false;
export const GET: APIRoute = async ({ locals }) => {
  // TODO: Replace with real auth once available
  const userId = "95f925a0-a5b9-47c2-b403-b29a9a66e88b";

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
