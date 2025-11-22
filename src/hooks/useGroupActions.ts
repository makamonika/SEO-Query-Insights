import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { CreateGroupRequestDto, UpdateGroupRequestDto, ErrorResponse } from "@/types";

export interface UseGroupActionsParams {
  refetch: () => void;
  setEditingId?: (id: string | null) => void;
}

export interface UseGroupActionsResult {
  isRenamingId: string | null;
  isDeletingId: string | null;
  isCreatingGroup: boolean;
  createGroupError: string | undefined;
  handleRename: (id: string, name: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleView: (id: string) => void;
  handleCreate: (payload: CreateGroupRequestDto, queryIds: string[]) => Promise<boolean>;
  clearCreateError: () => void;
}

/**
 * Custom hook to manage group actions (CRUD operations)
 * @param params - Callbacks for refetching data and updating UI state
 * @returns Action handlers and loading states
 */
export function useGroupActions({
  refetch,
  setEditingId,
}: UseGroupActionsParams): UseGroupActionsResult {
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string>();

  // Rename group handler
  const handleRename = useCallback(
    async (id: string, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error("Invalid name", {
          description: "Group name cannot be empty",
        });
        return;
      }

      setIsRenamingId(id);
      try {
        const response = await fetch(`/api/groups/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName } as UpdateGroupRequestDto),
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Group not found", {
              description: "This group may have been deleted",
            });
            refetch();
            return;
          }
          if (response.status === 409) {
            toast.error("Name already exists", {
              description: "A group with this name already exists",
            });
            return;
          }
          const errorData: ErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Failed to rename group");
        }

        const successMsg = `Group renamed to "${trimmedName}"`;
        toast.success("Group renamed", {
          description: successMsg,
        });
        if (setEditingId) {
          setEditingId(null);
        }
        refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to rename group", {
          description: message,
        });
      } finally {
        setIsRenamingId(null);
      }
    },
    [refetch, setEditingId]
  );

  // Delete group handler
  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeletingId(id);
      try {
        const response = await fetch(`/api/groups/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Group not found", {
              description: "This group may have been already deleted",
            });
            refetch();
            return;
          }
          const errorData: ErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Failed to delete group");
        }

        const successMsg = "Group deleted successfully";
        toast.success("Group deleted", {
          description: successMsg,
        });
        refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to delete group", {
          description: message,
        });
      } finally {
        setIsDeletingId(null);
      }
    },
    [refetch]
  );

  // View group handler
  const handleView = useCallback((id: string) => {
    window.location.href = `/groups/${id}`;
  }, []);

  // Create group handler
  const handleCreate = useCallback(
    async (payload: CreateGroupRequestDto, queryIds: string[]): Promise<boolean> => {
      setIsCreatingGroup(true);
      setCreateGroupError(undefined);

      try {
        const response = await fetch("/api/groups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            queryIds,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            setCreateGroupError("A group with this name already exists");
            return false;
          }
          if (response.status === 400) {
            const errorData = await response.json();
            setCreateGroupError(errorData.error?.message || "Invalid group data");
            return false;
          }
          if (response.status === 401) {
            toast.error("Authentication required", {
              description: "Redirecting to login...",
            });
            setTimeout(() => {
              window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
            }, 1000);
            return false;
          }
          throw new Error(`Failed to create group: ${response.statusText}`);
        }

        const createdGroup = await response.json();
        const successMsg = `Group "${createdGroup.name}" created with ${queryIds.length} queries`;
        toast.success("Group created", {
          description: successMsg,
        });
        refetch();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to create group", {
          description: message,
        });
        return false;
      } finally {
        setIsCreatingGroup(false);
      }
    },
    [refetch]
  );

  // Clear create error
  const clearCreateError = useCallback(() => {
    setCreateGroupError(undefined);
  }, []);

  return {
    isRenamingId,
    isDeletingId,
    isCreatingGroup,
    createGroupError,
    handleRename,
    handleDelete,
    handleView,
    handleCreate,
    clearCreateError,
  };
}
