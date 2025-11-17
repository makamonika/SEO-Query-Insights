/**
 * Import Configuration Module
 *
 * Provides configuration and utilities for import operations including URL resolution,
 * date formatting, validation, and configuration constants.
 */

import {
  IMPORT_SOURCE_BASE_URL,
  USE_MOCK_IMPORT_DATA,
  IMPORT_FETCH_TIMEOUT_MS,
  IMPORT_MAX_BYTES,
} from "astro:env/server";

/**
 * Formats a date into YYYYMMDD format in UTC timezone
 * @param date - Date to format
 * @returns String in YYYYMMDD format (e.g., "20251012")
 */
export function formatUtcYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Retrieves the base URL for import data sources from environment configuration
 *
 * TEMPORARY: When USE_MOCK_IMPORT_DATA is set to "true", this function will return
 * a dummy URL since the actual URL won't be used.
 *
 * @returns Base URL (HTTPS) for import data sources
 * @throws Error if IMPORT_SOURCE_BASE_URL is not configured (unless using mock data)
 */
export function getImportSourceBaseUrl(): string {
  // TEMPORARY: If using mock data, return a dummy URL
  const useMockData = USE_MOCK_IMPORT_DATA === "true";
  if (useMockData) {
    return "https://mock-data.local"; // Dummy URL, won't be used
  }

  const baseUrl = IMPORT_SOURCE_BASE_URL;

  if (!baseUrl) {
    throw new Error("IMPORT_SOURCE_BASE_URL is not configured");
  }

  // Validate that it's a valid URL
  try {
    const url = new URL(baseUrl);

    // Enforce HTTPS for security
    if (url.protocol !== "https:") {
      throw new Error("Import source URL must use HTTPS protocol");
    }

    return baseUrl;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid IMPORT_SOURCE_BASE_URL: ${baseUrl}`);
    }
    throw error;
  }
}

/**
 * Builds the full source URL for import data from 3 days ago
 * (GSC data has a 3-day delay)
 *
 * TEMPORARY: When USE_MOCK_IMPORT_DATA is set to "true", this function will return
 * a dummy URL since the actual URL won't be used by fetchImportData.
 *
 * @returns Full HTTPS URL to the data file from 3 days ago (or dummy URL if using mock data)
 */
export function buildDailyImportUrl(): string {
  const baseUrl = getImportSourceBaseUrl();

  // GSC data has a 3-day delay, so fetch data from 3 days ago
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const yyyymmdd = formatUtcYYYYMMDD(threeDaysAgo);
  const fileName = `data_${yyyymmdd}.json`;

  // Ensure base URL doesn't end with slash for clean concatenation
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${cleanBaseUrl}/${fileName}`;
}

/**
 * Configuration values for import operations
 */
export const ImportConfig = {
  /**
   * Maximum time allowed for fetch operation (milliseconds)
   */
  FETCH_TIMEOUT_MS: IMPORT_FETCH_TIMEOUT_MS as number,

  /**
   * Maximum size of import file in bytes (70 MB default)
   */
  MAX_BYTES: IMPORT_MAX_BYTES as number,

  /**
   * Number of rows to insert per batch operation
   */
  BATCH_SIZE: 1000,
} as const;
