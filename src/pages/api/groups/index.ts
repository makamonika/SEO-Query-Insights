import type { APIRoute } from "astro";
import type { ErrorResponse, GetGroupsResponseDto, GroupWithMetricsDto } from "../../../types";
import { groupListQuerySchema, createGroupSchema } from "../_schemas/group";
import { listGroups, createGroup, DuplicateGroupNameError } from "../../../lib/groups/service";

export const prerender = false;

/**
 * GET /api/groups
 * Lists groups owned by the current user with basic metrics scaffold.
 *
 * POST /api/groups
 * Creates a new group for the current user and returns it with metrics scaffold.
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */

export const GET: APIRoute = async ({ locals, request }) => {
  // TODO: Replace with real auth once available
  const userId = "76d5ed57-8598-4b97-9c1e-4dac1e1c74ce";

  try {
    const url = new URL(request.url);
    const parse = groupListQuerySchema.safeParse({
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      sortBy: url.searchParams.get("sortBy") || undefined,
      order: url.searchParams.get("order") || undefined,
      search: url.searchParams.get("search") || undefined,
    });

    if (!parse.success) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: "Invalid pagination parameters",
          details: parse.error.flatten(),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const groups = await listGroups(locals.supabase, userId, {
      limit: parse.data.limit,
      offset: parse.data.offset,
      sortBy: parse.data.sortBy,
      order: parse.data.order,
      search: parse.data.search,
    });
    const response: GetGroupsResponseDto = { data: groups };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[groups][GET] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to list groups",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  // TODO: Replace with real auth once available
  const userId = "76d5ed57-8598-4b97-9c1e-4dac1e1c74ce";

  try {
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

    const parsed = createGroupSchema.safeParse(body);
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

    try {
      const created = await createGroup(locals.supabase, userId, parsed.data);
      return new Response(JSON.stringify(created satisfies GroupWithMetricsDto), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      if (e instanceof DuplicateGroupNameError) {
        const errorResponse: ErrorResponse = {
          error: { code: "conflict", message: e.message },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw e;
    }
  } catch (error) {
    console.error("[groups][POST] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "Failed to create group",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
