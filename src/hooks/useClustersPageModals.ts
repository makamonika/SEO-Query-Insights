import { useState, useCallback } from "react";
import type { AIClusterViewModel } from "./useAIClustersSuggestions";
import type { QueryDto } from "@/types";

interface UseClustersPageModalsOptions {
  /** All clusters */
  clusters: AIClusterViewModel[];
  /** Rename cluster callback */
  rename: (id: string, name: string) => void;
  /** Update cluster queries callback */
  updateClusterQueries: (id: string, queries: QueryDto[]) => void;
  /** Discard cluster callback */
  discard: (id: string) => void;
}

interface UseClustersPageModalsReturn {
  // Edit modal state
  editingClusterId: string | null;
  editingCluster: AIClusterViewModel | null;
  handleOpenEdit: (id: string) => void;
  handleCloseEdit: () => void;
  handleSaveEdit: (changes: { name: string; queries: QueryDto[] }) => void;

  // Discard modal state
  discardingClusterId: string | null;
  discardingCluster: AIClusterViewModel | null;
  handleOpenDiscard: (id: string) => void;
  handleConfirmDiscard: () => void;
  handleCloseDiscard: () => void;
}

/**
 * Hook for managing ClustersPage modal states and handlers
 * Extracted from ClustersPage to reduce component complexity
 */
export function useClustersPageModals({
  clusters,
  rename,
  updateClusterQueries,
  discard,
}: UseClustersPageModalsOptions): UseClustersPageModalsReturn {
  // Edit modal state
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);

  // Discard modal state
  const [discardingClusterId, setDiscardingClusterId] = useState<string | null>(null);

  // Find clusters by ID
  const editingCluster = editingClusterId ? clusters.find((c) => c.id === editingClusterId) || null : null;

  const discardingCluster = discardingClusterId ? clusters.find((c) => c.id === discardingClusterId) || null : null;

  // Edit modal handlers
  const handleOpenEdit = useCallback((id: string) => {
    setEditingClusterId(id);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingClusterId(null);
  }, []);

  const handleSaveEdit = useCallback(
    (changes: { name: string; queries: QueryDto[] }) => {
      if (editingClusterId) {
        rename(editingClusterId, changes.name);
        updateClusterQueries(editingClusterId, changes.queries);
      }
      setEditingClusterId(null);
    },
    [editingClusterId, rename, updateClusterQueries]
  );

  // Discard modal handlers
  const handleOpenDiscard = useCallback((id: string) => {
    setDiscardingClusterId(id);
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    if (discardingClusterId) {
      discard(discardingClusterId);
    }
    setDiscardingClusterId(null);
  }, [discardingClusterId, discard]);

  const handleCloseDiscard = useCallback(() => {
    setDiscardingClusterId(null);
  }, []);

  return {
    // Edit modal
    editingClusterId,
    editingCluster,
    handleOpenEdit,
    handleCloseEdit,
    handleSaveEdit,

    // Discard modal
    discardingClusterId,
    discardingCluster,
    handleOpenDiscard,
    handleConfirmDiscard,
    handleCloseDiscard,
  };
}
