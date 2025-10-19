import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import type { PaginationMeta } from "@/types";

export interface PaginationProps {
  /** Pagination metadata from API response */
  meta: PaginationMeta;
  /** Callback when page changes - receives new offset value */
  onPageChange: (offset: number) => void;
  /** Callback when page size changes - receives new limit value */
  onPageSizeChange?: (limit: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Loading state to disable controls */
  isLoading?: boolean;
}

/**
 * Pagination component with page navigation and optional page size selector
 * Follows accessibility best practices with ARIA labels and keyboard navigation
 *
 * Uses PaginationMeta type for consistency with API responses.
 * Internally converts between offset/limit (API) and page numbers (UI).
 */
export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  isLoading = false,
}: PaginationProps) {
  const { total, limit, offset } = meta;

  // Convert offset/limit to page numbers for UI
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);

  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  const handleFirstPage = () => {
    if (canGoPrevious) onPageChange(0);
  };

  const handlePreviousPage = () => {
    if (canGoPrevious) onPageChange((currentPage - 2) * limit); // Previous page offset
  };

  const handleNextPage = () => {
    if (canGoNext) onPageChange(currentPage * limit); // Next page offset
  };

  const handleLastPage = () => {
    if (canGoNext) onPageChange((totalPages - 1) * limit); // Last page offset
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      const leftBound = Math.max(2, currentPage - 1);
      const rightBound = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis after first page if needed
      if (leftBound > 2) {
        pages.push("ellipsis");
      }

      // Add pages around current
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (rightBound < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
      {/* Left side: Items info and page size selector */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{total}</span> results
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-muted-foreground">
              Per page:
            </label>
            <select
              id="page-size"
              value={limit}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* First page button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFirstPage}
          disabled={!canGoPrevious}
          aria-label="Go to first page"
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousPage}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange((page - 1) * limit)}
                disabled={isLoading}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
                className="h-8 min-w-8 px-2"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next page button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextPage}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLastPage}
          disabled={!canGoNext}
          aria-label="Go to last page"
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
