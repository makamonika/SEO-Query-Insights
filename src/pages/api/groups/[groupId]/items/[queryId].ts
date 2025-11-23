import type { APIRoute } from "astro";
import { deleteItemParamsSchema } from "@/pages/api/_schemas/groupItem";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "@/lib/auth/utils";
import { GroupNotFoundError, removeGroupItem } from "@/lib/services/group-items.service";
import type { ErrorResponse } from "@/types";

export const prerender = false;
/**
 * DELETE /api/groups/:groupId/items/:queryId
 *
 * Remove a single query from a group by query ID.
 *
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  let userId: string;
  try {
    userId = requireUser(locals).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return buildUnauthorizedResponse(error.message);
    }
    throw error;
  }

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

  try {
    const result = await removeGroupItem(locals.supabase, userId, parsedParams.data.groupId, parsedParams.data.queryId);

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
