import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortOrder } from "@/types";
import type { ReactElement } from "react";

/**
 * Formats a number without thousand separators
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals);
}

/**
 * Formats a CTR value as a percentage
 * @param ctr - CTR value as decimal (e.g., 0.0523 for 5.23%)
 * @returns Formatted percentage string (e.g., "5.23%")
 */
export function formatCTR(ctr: number): string {
  return `${(ctr * 100).toFixed(2)}%`;
}

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string or "—" if no date
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns the appropriate sort icon component based on current sort state
 * @param isActive - Whether this column is currently being sorted
 * @param order - Current sort order ("asc" or "desc")
 * @returns Icon component with appropriate styling
 */
export function getSortIcon(isActive: boolean, order?: SortOrder): ReactElement {
  if (!isActive) {
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
  }
  return order === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
}

/**
 * Generic sort toggle handler that determines new sort order
 * @param currentField - Currently sorted field
 * @param currentOrder - Current sort order
 * @param clickedField - Field that was clicked
 * @param defaultOrder - Default order for the clicked field (default: "desc")
 * @returns New sort state { sortBy, order }
 */
export function getNextSortState<T extends string>(
  currentField: T,
  currentOrder: SortOrder,
  clickedField: T,
  defaultOrder: SortOrder = "desc"
): { sortBy: T; order: SortOrder } {
  if (currentField === clickedField) {
    // Toggle order if same field
    return {
      sortBy: clickedField,
      order: currentOrder === "asc" ? "desc" : "asc",
    };
  } else {
    // Use default order for new field
    return {
      sortBy: clickedField,
      order: defaultOrder,
    };
  }
}
