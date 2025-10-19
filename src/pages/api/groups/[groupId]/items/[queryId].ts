import type { APIRoute } from "astro";
import type { ErrorResponse } from "../../../../../types";
import { deleteItemParamsSchema } from "../../../_schemas/groupItem";
import { removeGroupItem, GroupNotFoundError } from "../../../../../lib/group-items/service";

export const prerender = false;
/**
 * DELETE /api/groups/:groupId/items/:queryId
 *
 * Remove a single query from a group by query ID.
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const userId = "95f925a0-a5b9-47c2-b403-b29a9a66e88b";

  // Validate path params
  const parsedParams = deleteItemParamsSchema.safeParse({
    groupId: params.groupId,
    queryId: params.queryId,
  });

  if (!parsedParams.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "validation_error",
        message: "Invalid parameters",
        details: parsedParams.error.flatten(),
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Remove item from group
  try {
    const result = await removeGroupItem(
      locals.supabase,
      userId,
      parsedParams.data.groupId,
      parsedParams.data.queryId
    );

    if (!result.removed) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "not_found",
          message: "Query not found in group",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
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
    console.error("[group-items][DELETE] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to remove item from group",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

