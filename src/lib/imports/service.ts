/**
 * Import Service
 *
 * Handles fetching, parsing, and importing Google Search Console data
 * into the queries table. Each record represents metrics for a specific
 * URL + query combination on a given date.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { TablesInsert } from "../../db/database.types";
import { ImportConfig } from "./config";
import { calculateCtrDecimal, computeIsOpportunity } from "../metrics";

/**
 * Raw GSC data record from import source
 * Represents metrics for a specific URL + query combination
 * Note: CTR is calculated from clicks/impressions, not provided in source data
 */
export interface GscDataRecord {
  date: string; // ISO date string (YYYY-MM-DD)
  query: string; // Search query text
  url: string; // Landing page URL
  impressions: number;
  clicks: number;
  avg_position: number; // Average position (1-based)
}

/**
 * Result of an import operation
 */
export interface ImportServiceResult {
  success: boolean;
  rowCount: number;
  error?: string;
}

/**
 * Computes whether a query represents an SEO opportunity
 * Business rule: impressions > 1000 AND ctr < 0.01 AND position between 5-15
 *
 * @param impressions - Number of impressions
 * @param ctr - Click-through rate (0-1)
 * @param avgPosition - Average position (1-based)
 * @returns True if query meets opportunity criteria
 */
// CTR and opportunity helpers moved to shared metrics module

/**
 * Validates and transforms a raw GSC record into a queries table insert
 *
 * @param record - Raw GSC data record
 * @returns Validated and transformed record for database insertion
 * @throws Error if record is invalid
 */
export function transformGscRecord(record: GscDataRecord): TablesInsert<"queries"> {
  // Validate required fields
  if (!record.date || !record.query || !record.url) {
    throw new Error("Missing required fields: date, query, or url");
  }

  // Normalize date format (handle both YYYY-MM-DD and ISO 8601 datetime)
  let normalizedDate = record.date;
  if (/^\d{4}-\d{2}-\d{2}T/.test(record.date)) {
    // Extract date part from ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss.sssZ)
    normalizedDate = record.date.split("T")[0];
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    // Validate date format if not ISO datetime
    throw new Error(`Invalid date format: ${record.date}`);
  }

  // Validate numeric fields
  if (typeof record.impressions !== "number" || record.impressions < 0) {
    throw new Error("Invalid impressions value");
  }
  if (typeof record.clicks !== "number" || record.clicks < 0) {
    throw new Error("Invalid clicks value");
  }
  if (typeof record.avg_position !== "number" || record.avg_position < 0) {
    throw new Error("Invalid avg_position value (must be >= 0)");
  }

  // Calculate CTR from clicks and impressions (decimal 0-1)
  const ctr = calculateCtrDecimal(record.clicks, record.impressions);

  // Round CTR to 2 decimal places (good enough for display)
  const roundedCtr = Math.round(ctr * 100) / 100;

  // Round avg_position to 2 decimal places to fit numeric(7,2)
  const roundedPosition = Math.round(record.avg_position * 100) / 100;

  // Validate that rounded values fit in database constraints
  if (roundedCtr > 1) {
    throw new Error(`CTR value ${roundedCtr} exceeds maximum of 1.0`);
  }
  if (roundedPosition > 99999.99) {
    throw new Error(`Position value ${roundedPosition} exceeds maximum of 99999.99`);
  }

  // Transform to database schema
  return {
    date: normalizedDate,
    query_text: record.query.toLowerCase(), // Store lowercase for consistency
    url: record.url,
    impressions: record.impressions,
    clicks: record.clicks,
    ctr: roundedCtr,
    avg_position: roundedPosition,
    is_opportunity: computeIsOpportunity(record.impressions, roundedCtr, roundedPosition),
  };
}

/**
 * Fetches data from the source URL with timeout and size limits
 *
 * @param sourceUrl - URL to fetch data from
 * @param timeoutMs - Maximum time to wait for response
 * @param maxBytes - Maximum size of response body
 * @param signal - AbortSignal for cancellation
 * @returns Parsed array of GSC records
 * @throws Error if fetch fails, times out, or data is invalid
 */
export async function fetchImportData(
  sourceUrl: string,
  timeoutMs: number,
  maxBytes: number,
  signal: AbortSignal
): Promise<GscDataRecord[]> {
  // Fetch with timeout via signal
  const response = await fetch(sourceUrl, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch import data: ${response.status} ${response.statusText}`);
  }

  // Check content-type
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Invalid content-type: expected application/json, got ${contentType}`);
  }

  // Check content-length if available
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > maxBytes) {
    throw new Error(`Response too large: ${contentLength} bytes exceeds limit of ${maxBytes}`);
  }

  // Parse JSON response
  const data = await response.json();

  // Validate data structure
  if (!Array.isArray(data)) {
    throw new Error("Invalid data format: expected array of records");
  }

  // Estimate size check (if content-length wasn't available)
  const dataSize = JSON.stringify(data).length;
  if (dataSize > maxBytes) {
    throw new Error(`Data too large: ${dataSize} bytes exceeds limit of ${maxBytes}`);
  }

  return data as GscDataRecord[];
}

/**
 * Inserts records in batches to optimize performance
 * Uses minimal returning to reduce response payload
 *
 * @param supabase - Supabase client
 * @param records - Array of records to insert
 * @param batchSize - Number of records per batch
 * @returns Total number of records inserted
 * @throws Error if any batch insert fails
 */
export async function batchInsertRecords(
  supabase: SupabaseClient<Database>,
  records: TablesInsert<"queries">[],
  batchSize: number
): Promise<number> {
  let totalInserted = 0;

  // Process records in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    // Insert batch with upsert semantics
    // Note: Supabase uses .upsert() for insert-or-update behavior
    // For now, we'll use .insert() and handle conflicts client-side via deduplication
    const { error } = await supabase.from("queries").insert(batch, { count: "exact" });

    if (error) {
      // Check if it's a unique constraint violation
      // In production, you might want to use .upsert() instead
      throw new Error(`Batch insert failed: ${error.message}`);
    }

    totalInserted += batch.length;
  }

  return totalInserted;
}

/**
 * Main import service function
 * Orchestrates the complete import process: fetch, parse, transform, and insert
 *
 * @param supabase - Supabase client
 * @param sourceUrl - URL to fetch data from
 * @param signal - AbortSignal for timeout/cancellation
 * @returns Import result with success status and row count
 */
export async function runImport(
  supabase: SupabaseClient<Database>,
  sourceUrl: string,
  signal: AbortSignal
): Promise<ImportServiceResult> {
  try {
    // Step 1: Fetch data from source
    const rawRecords = await fetchImportData(sourceUrl, ImportConfig.FETCH_TIMEOUT_MS, ImportConfig.MAX_BYTES, signal);

    if (rawRecords.length === 0) {
      return {
        success: true,
        rowCount: 0,
      };
    }

    // Step 2: Transform and validate records
    const transformedRecords: TablesInsert<"queries">[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRecords.length; i++) {
      try {
        const transformed = transformGscRecord(rawRecords[i]);
        transformedRecords.push(transformed);
      } catch (error) {
        // Log validation error but continue processing other records
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Record ${i}: ${errorMsg}`);
        console.log(`Validation error: ${errorMsg}`);

        // Stop if too many errors (more than 10% of records)
        if (errors.length > rawRecords.length * 0.1) {
          throw new Error(`Too many validation errors: ${errors.length} errors in ${rawRecords.length} records`);
        }
      }
    }

    if (transformedRecords.length === 0) {
      throw new Error("No valid records to import after validation");
    }

    // Step 3: Batch insert into database
    // Note: Data provider handles deduplication, so we insert all transformed records
    // Log sample record for debugging

    const rowCount = await batchInsertRecords(supabase, transformedRecords, ImportConfig.BATCH_SIZE);

    return {
      success: true,
      rowCount,
    };
  } catch (error) {
    // Handle abort/timeout
    if (signal.aborted) {
      return {
        success: false,
        rowCount: 0,
        error: "Import timed out",
      };
    }

    // Handle other errors
    const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      rowCount: 0,
      error: errorMsg,
    };
  }
}
