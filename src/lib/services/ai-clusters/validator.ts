import { isValidUUID } from "@/lib/utils/validation";

/**
 * Cluster Validator
 * Validates cluster data and query IDs
 */
export const ClusterValidator = {
  /**
   * Validate cluster name
   */
  validateClusterName(name: unknown): boolean {
    return name !== null && name !== undefined && typeof name === "string" && name.trim().length > 0;
  },

  /**
   * Validate and filter query IDs
   * Returns only valid UUIDs and tracks invalid count
   */
  validateQueryIds(ids: string[]): {
    validIds: string[];
    invalidCount: number;
  } {
    let invalidCount = 0;

    const validIds = ids.filter((id) => {
      if (!isValidUUID(id)) {
        invalidCount++;
        return false;
      }
      return true;
    });

    return { validIds, invalidCount };
  },

  /**
   * Validate cluster for acceptance
   */
  validateClusterForAcceptance(cluster: { name?: string; queryIds?: string[] }): {
    valid: boolean;
    error?: string;
  } {
    if (!cluster.name || typeof cluster.name !== "string" || cluster.name.trim().length === 0) {
      return { valid: false, error: "Cluster name cannot be empty" };
    }

    if (!Array.isArray(cluster.queryIds) || cluster.queryIds.length === 0) {
      return { valid: false, error: "Each cluster must have at least one query ID" };
    }

    return { valid: true };
  },
};
