import { useState, useCallback } from "react";

export interface UsePaginationReturn {
  pageSize: number;
  currentPage: number;
  offset: number;
  handlePageChange: (newOffset: number) => void;
  handlePageSizeChange: (newLimit: number) => void;
  resetPage: () => void;
}

export function usePagination(defaultPageSize = 50): UsePaginationReturn {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * pageSize;

  const handlePageChange = useCallback(
    (newOffset: number) => {
      setCurrentPage(Math.floor(newOffset / pageSize) + 1);
    },
    [pageSize]
  );

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setPageSize(newLimit);
    setCurrentPage(1);
  }, []);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  return {
    pageSize,
    currentPage,
    offset,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  };
}
