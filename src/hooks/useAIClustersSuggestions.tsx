import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { QueryDto } from "@/types";
import { useAIClustersState } from "./useAIClustersState";
import { useAIClustersActions } from "./useAIClustersActions";

// ============================================================================
// Types
// ============================================================================

/**
 * Client-side enriched model for AI cluster suggestions
 */
export interface AIClusterViewModel {
  id: string; // Generated client-side stable ID
  name: string;
  queries: QueryDto[];
  queryCount: number;
  metricsImpressions: number;
  metricsClicks: number;
  metricsCtr: number;
  metricsAvgPosition: number;
  isDirty?: boolean; // Tracks if user has edited this cluster
}

/**
 * Context value providing cluster state and actions
 */
export interface AIClustersContextValue {
  clusters: AIClusterViewModel[];
  selectedIds: Set<string>;
  isGenerating: boolean;
  isAccepting: boolean;
  liveMessage: string;
  hasValidSelection: boolean;
  generate: () => Promise<void>;
  setClusters: (clusters: AIClusterViewModel[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  rename: (id: string, name: string) => void;
  updateClusterQueries: (id: string, queries: QueryDto[]) => void;
  discard: (id: string) => void;
  acceptSelected: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AIClustersContext = createContext<AIClustersContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AIClustersProviderProps {
  children: ReactNode;
}

export function AIClustersProvider({ children }: AIClustersProviderProps) {
  // State management
  const {
    state,
    dispatch,
    setClusters,
    toggleSelect,
    selectAll,
    clearSelection,
    rename,
    updateClusterQueries,
    discard,
  } = useAIClustersState();

  // Actions (generate, accept)
  const { generate, acceptSelected: acceptSelectedAction } = useAIClustersActions({ dispatch });

  // Wrap acceptSelected to pass current state
  const acceptSelected = async () => {
    await acceptSelectedAction(state.clusters, state.selectedIds);
  };

  // Validation: check if selected clusters are valid
  const hasValidSelection = useMemo(() => {
    if (state.selectedIds.size === 0) return false;

    const selectedClusters = state.clusters.filter((c) => state.selectedIds.has(c.id));
    return selectedClusters.every(
      (c) => c.name.trim().length > 0 && c.name.trim().length <= 120 && c.queries.length > 0
    );
  }, [state.clusters, state.selectedIds]);

  const value: AIClustersContextValue = {
    clusters: state.clusters,
    selectedIds: state.selectedIds,
    isGenerating: state.isGenerating,
    isAccepting: state.isAccepting,
    liveMessage: state.liveMessage,
    hasValidSelection,
    generate,
    setClusters,
    toggleSelect,
    selectAll,
    clearSelection,
    rename,
    updateClusterQueries,
    discard,
    acceptSelected,
  };

  return <AIClustersContext.Provider value={value}>{children}</AIClustersContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access AI clusters context
 * Must be used within AIClustersProvider
 */
export function useAIClustersSuggestions(): AIClustersContextValue {
  const context = useContext(AIClustersContext);
  if (!context) {
    throw new Error("useAIClustersSuggestions must be used within AIClustersProvider");
  }
  return context;
}
