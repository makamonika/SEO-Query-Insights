import type { APIRoute } from 'astro';
import type { ErrorResponse } from '../../../../../types';
import { deleteItemParamsSchema } from '../../../_schemas/groupItem';
import { removeGroupItem, GroupNotFoundError } from '../../../../../lib/group-items/service';

/**
 * DELETE /api/groups/:groupId/items/:queryText
 * 
 * Remove a single query text from a group.
 * Query text is URL-decoded and normalized to lowercase.
 * 
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const userId = 'temp-user-id';

  // Validate path params
  const parsedParams = deleteItemParamsSchema.safeParse({
    groupId: params.groupId,
    queryText: params.queryText,
  });

  if (!parsedParams.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'validation_error',
        message: 'Invalid parameters',
        details: parsedParams.error.flatten(),
      },
    };
    return new Response(
      JSON.stringify(errorResponse),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Remove item from group
  try {
    const result = await removeGroupItem(
      locals.supabase,
      userId,
      parsedParams.data.groupId,
      parsedParams.data.queryText
    );

    if (!result.removed) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'not_found',
          message: 'Query text not found in group',
        },
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Handle specific errors
    if (error instanceof GroupNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'not_found',
          message: error.message,
        },
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle unexpected errors
    console.error('[group-items][DELETE] Unexpected error:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'internal',
        message: 'Failed to remove item from group',
      },
    };
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

