import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import type { GetGroupsResponseDto, GroupDto, SortOrder, PaginationMeta, PaginationParams } from "@/types";

/**
 * Valid sort fields for groups
 */
export type GroupSortField = "name" | "createdAt" | "aiGenerated";

export interface UseGroupsParams extends PaginationParams {
  search?: string;
  sortBy?: GroupSortField;
  order?: SortOrder;
}

export interface UseGroupsResult {
  data: GroupDto[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch groups with filters, sorting, and pagination
 * @param params - Query parameters for filtering and sorting
 * @returns Group data, pagination metadata, loading state, error, and refetch function
 */
export function useGroups(params: UseGroupsParams): UseGroupsResult {
  const [data, setData] = useState<GroupDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, limit: params.limit || 50, offset: params.offset || 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const hasLoadedRef = useRef<boolean>(false);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchGroups = async () => {
      // Only show loading on first load (tracked by hasLoadedRef) to avoid flashing loader on subsequent refetches
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const queryParams = new URLSearchParams();

        if (params.search) queryParams.append("search", params.search);
        if (params.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params.order) queryParams.append("order", params.order);
        if (params.limit !== undefined) {
          // Clamp limit to 1-200 as per plan requirements
          const clampedLimit = Math.max(1, Math.min(200, params.limit));
          queryParams.append("limit", String(clampedLimit));
        }
        if (params.offset !== undefined) {
          // Ensure offset is non-negative
          const clampedOffset = Math.max(0, params.offset);
          queryParams.append("offset", String(clampedOffset));
        }

        const response = await fetch(`/api/groups?${queryParams.toString()}`);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Redirect to login - will be handled by middleware in future
            toast.error("Authentication required", {
              description: "Redirecting to login...",
            });
            setTimeout(() => {
              window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
          }
          throw new Error(`Failed to fetch groups: ${response.statusText}`);
        }

        const result: GetGroupsResponseDto = await response.json();

        if (!isCancelled) {
          setData(result.data);
          setMeta(result.meta);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          toast.error("Failed to load groups", {
            description: error.message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchGroups();

    return () => {
      isCancelled = true;
    };
  }, [params.search, params.sortBy, params.order, params.limit, params.offset, refetchTrigger]);

  return { data, meta, isLoading, error, refetch };
}

/**
 * Custom hook to fetch a single group by ID
 * @param groupId - The ID of the group to fetch
 * @returns Group data, loading state, error, and refetch function
 */
export function useGroup(groupId: string) {
  const [data, setData] = useState<GroupDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchGroup = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Group not found");
          }
          if (response.status === 401 || response.status === 403) {
            toast.error("Authentication required", {
              description: "Redirecting to login...",
            });
            setTimeout(() => {
              window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
            }, 1000);
            return;
          }
          throw new Error(`Failed to fetch group: ${response.statusText}`);
        }

        const result: GroupDto = await response.json();

        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          toast.error("Failed to load group", {
            description: error.message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchGroup();

    return () => {
      isCancelled = true;
    };
  }, [groupId, refetchTrigger]);

  return { data, isLoading, error, refetch };
}
