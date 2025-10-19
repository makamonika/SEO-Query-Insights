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
import type { Database } from "../../db/database.types";
import type { ErrorResponse, ImportRunResultDto } from "../../types";
import { buildDailyImportUrl, ImportConfig } from "../../lib/imports/config";
import { runImport } from "../../lib/imports/service";

export const prerender = false;

/**
 * POST handler for import endpoint
 */
export const POST: APIRoute = async ({ locals }) => {
  const startTime = Date.now();

  // TODO: Step 2 - Authentication (skipped for now as per user request)
  // Will need to:
  // const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
  // if (authError || !user) return unauthorized response
  // const userId = user.id;

  // For MVP, using a placeholder userId
  const userId = "95f925a0-a5b9-47c2-b403-b29a9a66e88b";

  try {
    // Generate unique import ID for tracking
    const importId = crypto.randomUUID();

    // Step 3: Build source URL from settings
    let sourceUrl: string;
    try {
      sourceUrl = buildDailyImportUrl();
    } catch (error) {
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

    // Step 4: Log import_initiated action
    try {
      await locals.supabase.from("user_actions").insert({
        user_id: userId,
        action_type: "import_initiated",
        metadata: { importId, sourceUrl },
      });
    } catch (error) {
      console.error("[imports] Failed to log import_initiated action:", error);
      // Don't fail the request if logging fails - continue with import
    }

    // Step 5: Run import with timeout
    // TODO: Implement runImport service
    const result = await runImportWithTimeout(
      locals.supabase,
      userId,
      importId,
      sourceUrl,
      ImportConfig.FETCH_TIMEOUT_MS
    );

    if (result.success) {
      const durationMs = Date.now() - startTime;
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
      const durationMs = Date.now() - startTime;
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
  timeoutMs: number
): Promise<ImportResult> {
  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    // Run the import service
    const result = await runImport(supabase, sourceUrl, abortController.signal);

    clearTimeout(timeoutId);

    // Log completion
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

    // Log failure
    await logImportCompletion(supabase, userId, importId, result);

    return result;
  }
}

/**
 * Logs import completion to user_actions table
 */
async function logImportCompletion(
  supabase: SupabaseClient<Database>,
  userId: string,
  importId: string,
  result: ImportResult
): Promise<void> {
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
    // Don't throw - logging failures shouldn't break the response
  }
}
