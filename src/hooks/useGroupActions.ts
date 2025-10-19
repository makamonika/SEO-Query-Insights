import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { UpdateGroupRequestDto, CreateGroupRequestDto } from "@/types";

export interface UseGroupActionsParams {
  refetch: () => void;
  setLiveMessage: (message: string) => void;
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
  handleCreate: (payload: CreateGroupRequestDto, queryTexts: string[]) => Promise<boolean>;
  clearCreateError: () => void;
}

/**
 * Custom hook to manage group actions (CRUD operations)
 * @param params - Callbacks for refetching data and updating UI state
 * @returns Action handlers and loading states
 */
export function useGroupActions({
  refetch,
  setLiveMessage,
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
          throw new Error(`Failed to rename group: ${response.statusText}`);
        }

        const successMsg = `Group renamed to "${trimmedName}"`;
        toast.success("Group renamed", {
          description: successMsg,
        });
        setLiveMessage(successMsg);
        if (setEditingId) {
          setEditingId(null);
        }
        refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to rename group", {
          description: message,
        });
        setLiveMessage(`Failed to rename group: ${message}`);
      } finally {
        setIsRenamingId(null);
      }
    },
    [refetch, setLiveMessage, setEditingId]
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
          throw new Error(`Failed to delete group: ${response.statusText}`);
        }

        const successMsg = "Group deleted successfully";
        toast.success("Group deleted", {
          description: successMsg,
        });
        setLiveMessage(successMsg);
        refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to delete group", {
          description: message,
        });
        setLiveMessage(`Failed to delete group: ${message}`);
      } finally {
        setIsDeletingId(null);
      }
    },
    [refetch, setLiveMessage]
  );

  // View group handler
  const handleView = useCallback((id: string) => {
    window.location.href = `/groups/${id}`;
  }, []);

  // Create group handler
  const handleCreate = useCallback(
    async (payload: CreateGroupRequestDto, queryTexts: string[]): Promise<boolean> => {
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
            queryTexts,
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
        const successMsg = `Group "${createdGroup.name}" created with ${queryTexts.length} queries`;
        toast.success("Group created", {
          description: successMsg,
        });
        setLiveMessage(successMsg);
        refetch();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to create group", {
          description: message,
        });
        setLiveMessage(`Failed to create group: ${message}`);
        return false;
      } finally {
        setIsCreatingGroup(false);
      }
    },
    [refetch, setLiveMessage]
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

