import type { QueryDto, QuerySortField, SortOrder } from "@/types";

/**
 * Sorts an array of queries by the specified field and order
 * @param queries - Array of queries to sort
 * @param sortBy - Field to sort by
 * @param order - Sort order (asc or desc)
 * @returns Sorted array of queries
 */
export function sortQueries(queries: QueryDto[], sortBy: QuerySortField, order: SortOrder): QueryDto[] {
  const sorted = [...queries];
  sorted.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Handle string sorting (for queryText, url)
    if (typeof aVal === "string" && typeof bVal === "string") {
      const aStr = aVal as string;
      const bStr = bVal as string;
      return order === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }

    // Handle number sorting
    const diff = (aVal as number) - (bVal as number);
    return order === "asc" ? diff : -diff;
  });
  return sorted;
}
