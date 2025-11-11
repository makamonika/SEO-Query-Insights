import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GetQueriesResponseDto, QueryDto, PaginationMeta, PaginationParams } from "@/types";

export interface UseQueriesParams extends PaginationParams {
  search?: string;
  isOpportunity?: boolean;
  sortBy?: "impressions" | "clicks" | "ctr" | "avgPosition";
  order?: "asc" | "desc";
}

export interface UseQueriesResult {
  data: QueryDto[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch queries with filters, sorting, and pagination
 * @param params - Query parameters for filtering and sorting
 * @returns Query data, pagination metadata, loading state, error, and refetch function
 */
export function useQueries(params: UseQueriesParams): UseQueriesResult {
  const [data, setData] = useState<QueryDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, limit: params.limit || 50, offset: params.offset || 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchQueries = async () => {
      // Only show loading on first load or when we don't have data
      if (data.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const queryParams = new URLSearchParams();

        if (params.search) queryParams.append("search", params.search);
        if (params.isOpportunity !== undefined) {
          queryParams.append("isOpportunity", String(params.isOpportunity));
        }
        if (params.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params.order) queryParams.append("order", params.order);
        if (params.limit !== undefined) queryParams.append("limit", String(params.limit));
        if (params.offset !== undefined) queryParams.append("offset", String(params.offset));

        const response = await fetch(`/api/queries?${queryParams.toString()}`);

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login - will be handled by middleware in future
            toast.error("Authentication required", {
              description: "Redirecting to login...",
            });
            setTimeout(() => {
              window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
          }
          throw new Error(`Failed to fetch queries: ${response.statusText}`);
        }

        const result: GetQueriesResponseDto = await response.json();

        if (!isCancelled) {
          setData(result.data);
          setMeta(result.meta);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          toast.error("Failed to load queries", {
            description: error.message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchQueries();

    return () => {
      isCancelled = true;
    };
  }, [
    params.search,
    params.isOpportunity,
    params.sortBy,
    params.order,
    params.limit,
    params.offset,
    refetchTrigger,
    data.length,
  ]);

  return { data, meta, isLoading, error, refetch };
}
