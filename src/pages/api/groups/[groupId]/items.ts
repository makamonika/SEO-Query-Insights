import type { APIRoute } from "astro";
import { pathParamsSchema } from "../../_schemas/group";
import { addItemsBodySchema } from "../../_schemas/groupItem";
import { addGroupItems, getGroupItems, GroupNotFoundError } from "@/lib/services/group-items.service";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "../../../../lib/auth/utils";
import type { ErrorResponse, GetGroupItemsResponseDto } from "@/types";

export const prerender = false;

/**
 * GET /api/groups/:groupId/items
 *
 * Retrieve all queries that are members of a group.
 * Returns full query data with pagination metadata.
 * Ordered by impressions descending.
 *
 * Query Parameters:
 * - limit?: number - default 100, range 1-1000
 * - offset?: number - default 0, min 0
 *
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
  let userId: string;
  try {
    userId = requireUser(locals).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return buildUnauthorizedResponse(error.message);
    }
    throw error;
  }

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

  // Parse pagination parameters
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const limit = limitParam ? Math.max(1, Math.min(1000, parseInt(limitParam, 10))) : 100;
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

  // Fetch group items
  try {
    const result = await getGroupItems(locals.supabase, userId, parsedParams.data.groupId, {
      limit,
      offset,
    });

    const response: GetGroupItemsResponseDto = {
      data: result.data,
      meta: {
        total: result.total,
        limit,
        offset,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
    console.error("[group-items][GET] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to fetch group items",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/groups/:groupId/items
 *
 * Add one or more query texts to a group.
 * All texts are normalized to lowercase and deduplicated.
 * Returns count of newly added items (0 if all already existed).
 *
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  let userId: string;
  try {
    userId = requireUser(locals).id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return buildUnauthorizedResponse(error.message);
    }
    throw error;
  }

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
    const result = await addGroupItems(locals.supabase, userId, parsedParams.data.groupId, parsedBody.data.queryIds);

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
