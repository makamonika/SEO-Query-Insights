/**
 * POST /api/import
 *
 * Initiates a manual import of Google Search Console data from a configured source URL.
 * This MVP implementation runs synchronously and returns the final result.
 *
 * Note: GSC data has a 3-day delay, so this endpoint imports data from 3 days ago.
 *
 * Authentication: Required (JWT Bearer token via Supabase Auth)
 * Request Body: None
 *
 * Success Response (200):
 *   { status: 'completed', rowCount: number, durationMs: number }
 *
 * Error Responses:
 *   400 - Settings missing or invalid URL (validation_error)
 *   401 - Missing/invalid authentication (unauthorized)
 *   500 - Timeout or unexpected server error (internal)
 */

import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { ErrorResponse, ImportRunResultDto } from "@/types";
import { buildDailyImportUrl, ImportConfig } from "@/lib/imports/config";
import { runImport } from "@/lib/services/import.service";
import { requireUser, UnauthorizedError, buildUnauthorizedResponse } from "@/lib/auth/utils";

export const prerender = false;

/**
 * POST handler for import endpoint
 */
export const POST: APIRoute = async ({ locals }) => {
  const startTime = Date.now();

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
    const importId = crypto.randomUUID();

    let sourceUrl: string;
    let useMockData: boolean;
    try {
      const env = locals.runtime?.env || {};
      useMockData = env.USE_MOCK_IMPORT_DATA?.toLowerCase() === "true";
      sourceUrl = buildDailyImportUrl(env);
    } catch (error) {
      console.error("[imports] Failed to build import URL:", error);
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: error instanceof Error ? error.message : "Failed to build import source URL",
          details: { importId },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await locals.supabase.from("user_actions").insert({
        user_id: userId,
        action_type: "import_initiated",
        metadata: { importId, sourceUrl },
      });
    } catch (error) {
      console.error("[imports] Failed to log import_initiated action:", error);
    }

    const result = await runImportWithTimeout(
      locals.supabase,
      userId,
      importId,
      sourceUrl,
      ImportConfig.FETCH_TIMEOUT_MS,
      useMockData
    );

    const durationMs = Date.now() - startTime;

    if (result.success) {
      const response: ImportRunResultDto = {
        status: "completed",
        rowCount: result.rowCount,
        durationMs,
        completedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const errorResponse: ErrorResponse = {
        error: {
          code: "internal",
          message: result.error || "Import failed",
          details: { importId, durationMs },
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("[imports] Unexpected error:", error);

    const durationMs = Date.now() - startTime;
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "An unexpected error occurred during import",
        details: { durationMs },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * Import result from service layer
 */
interface ImportResult {
  success: boolean;
  rowCount: number;
  error?: string;
}

/**
 * Runs the import with a strict timeout
 * Returns the final result (success or failure)
 */
async function runImportWithTimeout(
  supabase: SupabaseClient<Database>,
  userId: string,
  importId: string,
  sourceUrl: string,
  timeoutMs: number,
  useMockData: boolean
): Promise<ImportResult> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const result = await runImport(supabase, sourceUrl, abortController.signal, useMockData);

    clearTimeout(timeoutId);

    await logImportCompletion(supabase, userId, importId, result);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    const result: ImportResult = {
      success: false,
      rowCount: 0,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Import timed out"
          : "Import failed with unexpected error",
    };

    await logImportCompletion(supabase, userId, importId, result);

    return result;
  }
}

/**
 * Logs import completion to user_actions table and console
 */
async function logImportCompletion(
  supabase: SupabaseClient<Database>,
  userId: string,
  importId: string,
  result: ImportResult
): Promise<void> {
  if (!result.success && result.error) {
    console.error("[imports] Import failed:", result.error);
  }

  try {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "import_completed",
      metadata: {
        importId,
        success: result.success,
        rowCount: result.rowCount,
        error: result.error,
      },
    });
  } catch (error) {
    console.error("[imports] Failed to log import_completed action:", error);
  }
}
