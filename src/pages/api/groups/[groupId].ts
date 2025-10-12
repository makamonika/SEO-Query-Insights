import type { APIRoute } from 'astro';
import type { ErrorResponse } from '../../../types';
import { pathParamsSchema, updateGroupSchema } from '../_schemas/group';
import { getGroupById, updateGroup, deleteGroup, DuplicateGroupNameError } from '../../../lib/groups/service';

/**
 * GET /api/groups/:groupId
 * PATCH /api/groups/:groupId
 * DELETE /api/groups/:groupId
 *
 * Authentication is skipped for now per instructions; a placeholder userId is used.
 */

export const GET: APIRoute = async ({ params, locals }) => {
  const userId = 'temp-user-id';
  const parsed = pathParamsSchema.safeParse({ groupId: params.groupId });
  if (!parsed.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'validation_error',
        message: 'Invalid groupId',
        details: parsed.error.flatten(),
      },
    };
    return new Response(JSON.stringify(errorResponse), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const group = await getGroupById(locals.supabase, userId, parsed.data.groupId);
    if (!group) {
      return new Response(null, { status: 404 });
    }
    return new Response(JSON.stringify(group), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[groups][GET:id] Unexpected error:', error);
    const errorResponse: ErrorResponse = { error: { code: 'internal', message: 'Failed to fetch group' } };
    return new Response(JSON.stringify(errorResponse), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const userId = 'temp-user-id';
  const parsedParams = pathParamsSchema.safeParse({ groupId: params.groupId });
  if (!parsedParams.success) {
    const errorResponse: ErrorResponse = {
      error: { code: 'validation_error', message: 'Invalid groupId', details: parsedParams.error.flatten() },
    };
    return new Response(JSON.stringify(errorResponse), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResponse: ErrorResponse = { error: { code: 'validation_error', message: 'Request body must be valid JSON' } };
    return new Response(JSON.stringify(errorResponse), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const parsedBody = updateGroupSchema.safeParse(body);
  if (!parsedBody.success) {
    const errorResponse: ErrorResponse = { error: { code: 'validation_error', message: 'Invalid request body', details: parsedBody.error.flatten() } };
    return new Response(JSON.stringify(errorResponse), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    try {
      const updated = await updateGroup(locals.supabase, userId, parsedParams.data.groupId, parsedBody.data);
      if (!updated) {
        return new Response(null, { status: 404 });
      }
      return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      if (e instanceof DuplicateGroupNameError) {
        const errorResponse: ErrorResponse = { error: { code: 'conflict', message: e.message } };
        return new Response(JSON.stringify(errorResponse), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      throw e;
    }
  } catch (error) {
    console.error('[groups][PATCH:id] Unexpected error:', error);
    const errorResponse: ErrorResponse = { error: { code: 'internal', message: 'Failed to update group' } };
    return new Response(JSON.stringify(errorResponse), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const userId = 'temp-user-id';
  const parsed = pathParamsSchema.safeParse({ groupId: params.groupId });
  if (!parsed.success) {
    const errorResponse: ErrorResponse = { error: { code: 'validation_error', message: 'Invalid groupId', details: parsed.error.flatten() } };
    return new Response(JSON.stringify(errorResponse), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const removed = await deleteGroup(locals.supabase, userId, parsed.data.groupId);
    if (!removed) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[groups][DELETE:id] Unexpected error:', error);
    const errorResponse: ErrorResponse = { error: { code: 'internal', message: 'Failed to delete group' } };
    return new Response(JSON.stringify(errorResponse), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


