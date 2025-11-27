import { usePagination, type UsePaginationReturn } from "./usePagination";
import { useSorting, type UseSortingReturn, type SortOrder } from "./useSorting";

export interface UseTableStateReturn<T extends string> extends UsePaginationReturn, UseSortingReturn<T> {}

export function useTableState<T extends string>(
  defaultSortBy: T,
  defaultOrder: SortOrder = "desc",
  defaultPageSize = 50
): UseTableStateReturn<T> {
  const pagination = usePagination(defaultPageSize);
  const sorting = useSorting<T>(defaultSortBy, defaultOrder);

  return {
    ...pagination,
    ...sorting,
  };
}
