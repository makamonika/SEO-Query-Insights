import type { APIRoute } from "astro";
import type { ErrorResponse, AcceptClustersResponseDto } from "@/types";
import { acceptClustersRequestSchema } from "@/pages/api/_schemas/aiCluster";
import { ClusterAcceptorService } from "@/lib/services/ai-clusters";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "@/lib/auth/utils";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
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
    const groups = await ClusterAcceptorService.acceptClusters(locals.supabase, userId, parsed.data.clusters);

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
