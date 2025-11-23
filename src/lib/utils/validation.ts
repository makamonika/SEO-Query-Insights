/**
 * Validation utilities
 * Shared validation functions for use across services
 */

/**
 * UUID v4 format regex pattern
 * Matches: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 * @param id - String to validate
 * @returns True if the string matches UUID format
 */
export function isValidUUID(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 && UUID_REGEX.test(id);
}

/**
 * Validates a UUID and throws an error if invalid
 * @param id - UUID to validate
 * @param fieldName - Name of the field for error message (default: "ID")
 * @returns The validated UUID string
 * @throws Error if UUID is invalid
 */
export function validateUUID(id: unknown, fieldName = "ID"): string {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return id;
}
