/**
 * Application configuration
 * Simple hardcoded settings for the app
 */

/**
 * Daily import time configuration
 *
 * The import button will appear if data hasn't been imported after this time today.
 *
 * To change the daily import time, simply update these constants:
 * - DAILY_IMPORT_HOUR: Hour in 24-hour format (0-23)
 * - DAILY_IMPORT_MINUTE: Minute (0-59)
 *
 * Examples:
 * - 9:00 AM  → DAILY_IMPORT_HOUR = 9,  DAILY_IMPORT_MINUTE = 0
 * - 11:30 AM → DAILY_IMPORT_HOUR = 11, DAILY_IMPORT_MINUTE = 30
 * - 2:00 PM  → DAILY_IMPORT_HOUR = 14, DAILY_IMPORT_MINUTE = 0
 */
export const DAILY_IMPORT_HOUR = 11; // 11:00 AM
export const DAILY_IMPORT_MINUTE = 0;
