import { useState, useCallback } from "react";

export type SortOrder = "asc" | "desc";

export interface UseSortingReturn<T extends string> {
  sortBy: T;
  order: SortOrder;
  handleSortChange: (params: { sortBy: T; order: SortOrder }) => void;
}

export function useSorting<T extends string>(defaultSortBy: T, defaultOrder: SortOrder = "desc"): UseSortingReturn<T> {
  const [sortBy, setSortBy] = useState<T>(defaultSortBy);
  const [order, setOrder] = useState<SortOrder>(defaultOrder);

  const handleSortChange = useCallback(({ sortBy: newSortBy, order: newOrder }: { sortBy: T; order: SortOrder }) => {
    setSortBy(newSortBy);
    setOrder(newOrder);
  }, []);

  return { sortBy, order, handleSortChange };
}
