import type { APIRoute } from "astro";
import type { ErrorResponse, QueryDto } from "../../../../types";
import { pathParamsSchema } from "../../_schemas/group";
import { addItemsBodySchema } from "../../_schemas/groupItem";
import { addGroupItems, getGroupItems, GroupNotFoundError } from "../../../../lib/group-items/service";

export const prerender = false;

/**
 * GET /api/groups/:groupId/items
 *
 * Retrieve all queries that are members of a group.
 * Returns full query data (QueryDto[]) ordered by impressions descending.
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const userId = "95f925a0-a5b9-47c2-b403-b29a9a66e88b";

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

  // Fetch group items
  try {
    const items: QueryDto[] = await getGroupItems(locals.supabase, userId, parsedParams.data.groupId);

    return new Response(JSON.stringify(items), {
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
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = "95f925a0-a5b9-47c2-b403-b29a9a66e88b";

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
