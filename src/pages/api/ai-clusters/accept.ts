import type { APIRoute } from "astro";
import type { ErrorResponse, AcceptClustersResponseDto } from "../../../types";
import { acceptClustersRequestSchema } from "../_schemas/aiCluster";
import { acceptClusters } from "../../../lib/ai-clusters/service";

/**
 * POST /api/ai-clusters/accept
 * Accepts AI cluster suggestions and persists them as groups with ai_generated = true.
 *
 * Request body:
 * {
 *   clusters: [{ name: string, queryTexts: string[] }, ...]
 * }
 *
 * Response: AcceptClustersResponseDto with created groups
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */

export const POST: APIRoute = async ({ locals, request }) => {
  // TODO: Replace with real auth once available
  const userId = "temp-user-id";

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: "Request body must be valid JSON",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const parsed = acceptClustersRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Accept clusters and create groups
    const groups = await acceptClusters(locals.supabase, userId, parsed.data.clusters);

    const response: AcceptClustersResponseDto = { groups };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-clusters/accept][POST] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to accept clusters",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
