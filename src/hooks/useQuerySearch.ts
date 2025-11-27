import { useState, useCallback, useMemo, useEffect } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { useQueries } from "./useQueries";
import { useSelection } from "./useSelection";
import type { QuerySortField, SortOrder, QueryDto, PaginationMeta } from "@/types";

interface UseQuerySearchOptions {
  /** Query IDs to exclude from results */
  excludeIds?: Set<string>;
  /** Maximum number of results to fetch (used when pagination is disabled) */
  limit?: number;
  /** Initial sort field */
  initialSortBy?: QuerySortField;
  /** Initial sort order */
  initialOrder?: SortOrder;
  /** Whether to reset state when a reset trigger changes */
  resetTrigger?: boolean;
  /** Enable pagination support */
  enablePagination?: boolean;
  /** Initial page size (only used when pagination is enabled) */
  initialPageSize?: number;
}

interface UseQuerySearchReturn {
  // Search and filter state
  search: string;
  setSearch: (value: string) => void;
  isOpportunity: boolean | undefined;
  setIsOpportunity: (value: boolean | undefined) => void;

  // Sorting state
  sortBy: QuerySortField;
  order: SortOrder;
  handleSortChange: (params: { sortBy: QuerySortField; order: SortOrder }) => void;

  // Pagination state (only populated when enablePagination is true)
  pageSize: number;
  currentPage: number;
  offset: number;
  handlePageChange: (newOffset: number) => void;
  handlePageSizeChange: (newLimit: number) => void;

  // Selection state
  selected: Set<string>;
  toggleRow: (id: string) => void;
  clearSelection: () => void;

  // Query data
  queries: QueryDto[];
  availableQueries: QueryDto[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Reset function
  reset: () => void;
}

/**
 * Hook for managing query search, filtering, sorting, and selection
 * Supports both paginated and non-paginated modes
 * Extracted from AddQueriesToGroupModal, EditClusterModal, and QueriesPage to reduce duplication
 */
export function useQuerySearch(options: UseQuerySearchOptions = {}): UseQuerySearchReturn {
  const {
    excludeIds,
    limit = 100,
    initialSortBy = "impressions",
    initialOrder = "desc",
    resetTrigger,
    enablePagination = false,
    initialPageSize = 50,
  } = options;

  // Search and filter state
  const [search, setSearch] = useState("");
  const [isOpportunity, setIsOpportunity] = useState<boolean | undefined>(undefined);

  // Sorting state
  const [sortBy, setSortBy] = useState<QuerySortField>(initialSortBy);
  const [order, setOrder] = useState<SortOrder>(initialOrder);

  // Pagination state (only used when enablePagination is true)
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate offset from current page
  const offset = enablePagination ? (currentPage - 1) * pageSize : 0;

  // Debounce search term to avoid too many API calls
  const debouncedSearch = useDebouncedValue(search, 300);

  // Selection management
  const { selected, toggleRow, clearSelection } = useSelection();

  // Fetch queries with search filter
  const {
    data: queries,
    meta,
    isLoading,
    error,
    refetch,
  } = useQueries({
    search: debouncedSearch,
    isOpportunity,
    sortBy,
    order,
    limit: enablePagination ? pageSize : limit,
    offset,
  });

  // Filter out excluded queries if provided
  const availableQueries = useMemo(() => {
    if (!excludeIds || excludeIds.size === 0) {
      return queries;
    }
    return queries.filter((query) => !excludeIds.has(query.id));
  }, [queries, excludeIds]);

  // Handle sort change
  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: QuerySortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
      if (enablePagination) {
        setCurrentPage(1); // Reset to first page on sort change
      }
    },
    [enablePagination]
  );

  // Pagination handlers
  const handlePageChange = useCallback(
    (newOffset: number) => {
      if (enablePagination) {
        setCurrentPage(Math.floor(newOffset / pageSize) + 1);
      }
    },
    [enablePagination, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (newLimit: number) => {
      if (enablePagination) {
        setPageSize(newLimit);
        setCurrentPage(1); // Reset to first page when page size changes
      }
    },
    [enablePagination]
  );

  // Enhanced setSearch that resets page when pagination is enabled
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (enablePagination) {
        setCurrentPage(1); // Reset to first page on search
      }
    },
    [enablePagination]
  );

  // Enhanced setIsOpportunity that resets page when pagination is enabled
  const handleOpportunityChange = useCallback(
    (value: boolean | undefined) => {
      setIsOpportunity(value);
      if (enablePagination) {
        setCurrentPage(1); // Reset to first page on filter change
      }
    },
    [enablePagination]
  );

  // Reset all state to initial values
  const reset = useCallback(() => {
    setSearch("");
    setIsOpportunity(undefined);
    setSortBy(initialSortBy);
    setOrder(initialOrder);
    clearSelection();
    if (enablePagination) {
      setCurrentPage(1);
      setPageSize(initialPageSize);
    }
  }, [initialSortBy, initialOrder, clearSelection, enablePagination, initialPageSize]);

  // Reset when resetTrigger changes (e.g., when modal opens)
  useEffect(() => {
    if (resetTrigger) {
      reset();
    }
  }, [resetTrigger, reset]);

  return {
    // Search and filter
    search,
    setSearch: handleSearchChange,
    isOpportunity,
    setIsOpportunity: handleOpportunityChange,

    // Sorting
    sortBy,
    order,
    handleSortChange,

    // Pagination
    pageSize,
    currentPage,
    offset,
    handlePageChange,
    handlePageSizeChange,

    // Selection
    selected,
    toggleRow,
    clearSelection,

    // Data
    queries,
    availableQueries,
    meta,
    isLoading,
    error,
    refetch,

    // Reset
    reset,
  };
}
