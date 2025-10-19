import type { APIRoute } from "astro";
import type { ErrorResponse } from "../../../../types";
import { pathParamsSchema } from "../../_schemas/group";
import { addItemsBodySchema } from "../../_schemas/groupItem";
import { addGroupItems, GroupNotFoundError } from "../../../../lib/group-items/service";

export const prerender = false;

/**
 * POST /api/groups/:groupId/items
 *
 * Add one or more query texts to a group.
 * All texts are normalized to lowercase and deduplicated.
 * Returns count of newly added items (0 if all already existed).
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = "76d5ed57-8598-4b97-9c1e-4dac1e1c74ce";

  // Validate path params
  const parsedParams = pathParamsSchema.safeParse({ groupId: params.groupId });
  if (!parsedParams.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "validation_error",
        message: "Invalid groupId",
        details: parsedParams.error.flatten(),
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
  const parsedBody = addItemsBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "validation_error",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Add items to group
  try {
    const result = await addGroupItems(locals.supabase, userId, parsedParams.data.groupId, parsedBody.data.queryTexts);

    // Return 201 if items were added, 200 if all already existed
    const status = result.addedCount > 0 ? 201 : 200;

    return new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // Handle specific errors
    if (error instanceof GroupNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "not_found",
          message: error.message,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("[group-items][POST] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to add items to group",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
