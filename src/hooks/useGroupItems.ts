import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { QueryDto, ErrorResponse, GetGroupItemsResponseDto, PaginationMeta, PaginationParams } from "@/types";

export type UseGroupItemsParams = PaginationParams;

/**
 * Custom hook to fetch all queries that are members of a group
 * @param groupId - The ID of the group
 * @param params - Optional pagination parameters
 * @returns Query data, pagination metadata, loading state, error, and refetch function
 */
export function useGroupItems(groupId: string, params?: UseGroupItemsParams) {
  const [data, setData] = useState<QueryDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    limit: params?.limit || 50,
    offset: params?.offset || 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchGroupItems = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (params?.limit !== undefined) queryParams.append("limit", String(params.limit));
        if (params?.offset !== undefined) queryParams.append("offset", String(params.offset));

        const url = `/api/groups/${encodeURIComponent(groupId)}/items${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;
        const response = await fetch(url);

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
          throw new Error(`Failed to fetch group items: ${response.statusText}`);
        }

        const result: GetGroupItemsResponseDto = await response.json();

        if (!isCancelled) {
          setData(result.data);
          setMeta(result.meta);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          toast.error("Failed to load group items", {
            description: error.message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchGroupItems();

    return () => {
      isCancelled = true;
    };
  }, [groupId, params?.limit, params?.offset, refetchTrigger]);

  return { data, meta, isLoading, error, refetch };
}

/**
 * Custom hook to add queries to a group
 * @returns Mutation function, loading state, and error
 */
export function useAddGroupItems() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addItems = async (groupId: string, queryIds: string[]): Promise<{ addedCount: number }> => {
    if (!queryIds.length) {
      throw new Error("No queries selected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queryIds }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        if (errorData.error.code === "not_found") {
          throw new Error("Group not found");
        }
        throw new Error(errorData.error.message || "Failed to add queries to group");
      }

      const result = await response.json();

      // Show appropriate success message
      if (result.addedCount === 0) {
        toast.info("All selected queries were already in the group");
      } else if (result.addedCount === queryIds.length) {
        toast.success(`Added ${result.addedCount} ${result.addedCount === 1 ? "query" : "queries"} to group`);
      } else {
        toast.success(`Added ${result.addedCount} ${result.addedCount === 1 ? "query" : "queries"} to group`, {
          description: `${queryIds.length - result.addedCount} ${queryIds.length - result.addedCount === 1 ? "was" : "were"} already in the group`,
        });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      toast.error("Failed to add queries", {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addItems, isLoading, error };
}

/**
 * Custom hook to remove a query from a group
 * @returns Mutation function, loading state, and error
 */
export function useRemoveGroupItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [removingQueryId, setRemovingQueryId] = useState<string | null>(null);

  const removeItem = async (groupId: string, queryId: string): Promise<void> => {
    setIsLoading(true);
    setRemovingQueryId(queryId);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/items/${encodeURIComponent(queryId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        if (errorData.error.code === "not_found") {
          throw new Error("Query not found in group");
        }
        throw new Error(errorData.error.message || "Failed to remove item from group");
      }

      toast.success("Removed from group");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      toast.error("Failed to remove item", {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
      setRemovingQueryId(null);
    }
  };

  return { removeItem, isLoading, error, removingQueryId };
}
