import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useImport } from "./useImport";
import { useImportStatus } from "./useImportStatus";
import { useAIClusters } from "./useAIClusters";
import { useGroupActions } from "./useGroupActions";
import type { CreateGroupRequestDto } from "@/types";

interface UseQueriesPageActionsOptions {
  /** Function to refetch queries after actions */
  refetch: () => void;
  /** Function to set live region message for accessibility */
  setLiveMessage: (message: string | undefined) => void;
  /** Selected query IDs */
  selectedIds: Set<string>;
  /** Function to clear selection after group creation */
  clearSelection: () => void;
}

interface UseQueriesPageActionsReturn {
  // Import actions
  isImporting: boolean;
  lastImportAt: string | null | undefined;
  hasFailed: boolean;
  handleImport: () => Promise<void>;
  importStatusLastImportAt: string | null | undefined;

  // AI cluster generation
  isGeneratingAI: boolean;
  handleGenerateAI: () => Promise<void>;

  // Group creation
  isCreatingGroup: boolean;
  createGroupError: string | null | undefined;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  handleOpenNewGroup: () => void;
  handleCreateGroup: (payload: CreateGroupRequestDto) => Promise<void>;
  clearCreateError: () => void;
}

/**
 * Hook for managing QueriesPage-specific actions
 * Extracted from QueriesPage to reduce component complexity
 */
export function useQueriesPageActions({
  refetch,
  setLiveMessage,
  selectedIds,
  clearSelection,
}: UseQueriesPageActionsOptions): UseQueriesPageActionsReturn {
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Import management
  const { isImporting, lastImportAt, hasFailed, handleImport, setLastImportAt } = useImport(refetch, setLiveMessage);

  // AI cluster generation
  const { isGeneratingAI, handleGenerateAI } = useAIClusters({
    setLiveMessage,
    navigateToAIClusters: true, // Navigate to AI clusters page after generation
  });

  // Group actions (create group)
  const { isCreatingGroup, createGroupError, handleCreate, clearCreateError } = useGroupActions({
    refetch,
  });

  // Fetch initial import status on mount
  const importStatus = useImportStatus();

  // Set initial lastImportAt when status loads
  useEffect(() => {
    if (importStatus.lastImportAt && !lastImportAt) {
      setLastImportAt(importStatus.lastImportAt);
    }
  }, [importStatus.lastImportAt, lastImportAt, setLastImportAt]);

  // Open create group modal handler
  const handleOpenNewGroup = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No queries selected", {
        description: "Please select at least one query to create a group",
      });
      return;
    }
    setIsCreateModalOpen(true);
    clearCreateError();
  }, [selectedIds.size, clearCreateError]);

  // Create group handler
  const handleCreateGroup = useCallback(
    async (payload: CreateGroupRequestDto) => {
      const queryIds = Array.from(selectedIds);
      const success = await handleCreate(payload, queryIds);

      if (success) {
        // Close modal and clear selection on success
        setIsCreateModalOpen(false);
        clearSelection();
      }
    },
    [selectedIds, handleCreate, clearSelection]
  );

  return {
    // Import
    isImporting,
    lastImportAt,
    hasFailed,
    handleImport,
    importStatusLastImportAt: importStatus.lastImportAt,

    // AI clusters
    isGeneratingAI,
    handleGenerateAI,

    // Group creation
    isCreatingGroup,
    createGroupError,
    isCreateModalOpen,
    setIsCreateModalOpen,
    handleOpenNewGroup,
    handleCreateGroup,
    clearCreateError,
  };
}
