import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import type { AiClusterSuggestionDto, AcceptClustersRequestDto, QueryDto } from "@/types";
import { parseErrorResponse, getErrorMessage } from "@/lib/api-error-handler";

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
// State Management
// ============================================================================

interface State {
  clusters: AIClusterViewModel[];
  selectedIds: Set<string>;
  isGenerating: boolean;
  isAccepting: boolean;
  liveMessage: string;
}

type Action =
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "SET_ACCEPTING"; payload: boolean }
  | { type: "SET_LIVE_MESSAGE"; payload: string }
  | { type: "SET_CLUSTERS"; payload: AIClusterViewModel[] }
  | { type: "TOGGLE_SELECT"; payload: string }
  | { type: "SELECT_ALL" }
  | { type: "CLEAR_SELECTION" }
  | { type: "RENAME_CLUSTER"; payload: { id: string; name: string } }
  | { type: "UPDATE_CLUSTER_QUERIES"; payload: { id: string; queries: QueryDto[] } }
  | { type: "DISCARD_CLUSTER"; payload: string };

const initialState: State = {
  clusters: [],
  selectedIds: new Set(),
  isGenerating: false,
  isAccepting: false,
  liveMessage: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_GENERATING":
      return { ...state, isGenerating: action.payload };

    case "SET_ACCEPTING":
      return { ...state, isAccepting: action.payload };

    case "SET_LIVE_MESSAGE":
      return { ...state, liveMessage: action.payload };

    case "SET_CLUSTERS":
      return { ...state, clusters: action.payload, selectedIds: new Set() };

    case "TOGGLE_SELECT": {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedIds: newSelected };
    }

    case "SELECT_ALL":
      return { ...state, selectedIds: new Set(state.clusters.map((c) => c.id)) };

    case "CLEAR_SELECTION":
      return { ...state, selectedIds: new Set() };

    case "RENAME_CLUSTER":
      return {
        ...state,
        clusters: state.clusters.map((c) =>
          c.id === action.payload.id ? { ...c, name: action.payload.name, isDirty: true } : c
        ),
      };

    case "UPDATE_CLUSTER_QUERIES": {
      return {
        ...state,
        clusters: state.clusters.map((c) => {
          if (c.id === action.payload.id) {
            return {
              ...c,
              queries: action.payload.queries,
              queryCount: action.payload.queries.length,
              isDirty: true,
            };
          }
          return c;
        }),
      };
    }

    case "DISCARD_CLUSTER":
      return {
        ...state,
        clusters: state.clusters.filter((c) => c.id !== action.payload),
        selectedIds: new Set([...state.selectedIds].filter((id) => id !== action.payload)),
      };

    default:
      return state;
  }
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

/**
 * Generates a stable client-side ID for a cluster based on its content
 */
function generateClusterId(suggestion: AiClusterSuggestionDto): string {
  // Simple stable hash: combine name and sorted query IDs
  const queryIds = suggestion.queries.map((q) => q.id).sort();
  const content = `${suggestion.name}:${queryIds.join(",")}`;
  // Use a simple hash for demo; in production consider crypto.randomUUID() or better hashing
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `cluster-${Math.abs(hash)}`;
}

/**
 * Converts API suggestion DTO to view model
 */
function toViewModel(suggestion: AiClusterSuggestionDto): AIClusterViewModel {
  return {
    id: generateClusterId(suggestion),
    name: suggestion.name,
    queries: suggestion.queries,
    queryCount: suggestion.queryCount,
    metricsImpressions: suggestion.metricsImpressions,
    metricsClicks: suggestion.metricsClicks,
    metricsCtr: suggestion.metricsCtr,
    metricsAvgPosition: suggestion.metricsAvgPosition,
    isDirty: false,
  };
}

export function AIClustersProvider({ children }: AIClustersProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const generate = useCallback(async () => {
    dispatch({ type: "SET_GENERATING", payload: true });
    dispatch({ type: "SET_LIVE_MESSAGE", payload: "Generating AI clusters..." });

    try {
      const response = await fetch("/api/ai-clusters");

      console.log("AI clusters response status:", response.status);

      if (!response.ok) {
        const errorResponse = await parseErrorResponse(response);
        const errorMessage = getErrorMessage(errorResponse, `Failed to generate clusters: ${response.statusText}`);

        // Handle specific error codes with user-friendly messages
        if (response.status === 401) {
          toast.error("Authentication required", {
            description: "Redirecting to login...",
          });
          setTimeout(() => {
            window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
          }, 1000);
          return;
        }

        if (response.status === 429 || errorResponse?.error.code === "rate_limited") {
          toast.error("Rate limited", {
            description: errorMessage || "Too many requests. Please try again in a minute.",
          });
          return;
        }

        if (response.status === 503 || response.status === 504) {
          const isRetryable = errorResponse?.error.details?.retryable === true;
          toast.error("Service temporarily unavailable", {
            description:
              errorMessage ||
              (isRetryable
                ? "The AI service is busy. Please try again in a moment."
                : "The AI service is unavailable. Please try again later."),
          });
          return;
        }

        // Generic error handling
        toast.error("Failed to generate AI clusters", {
          description: errorMessage,
        });
        return;
      }

      const suggestions: AiClusterSuggestionDto[] = await response.json();
      console.log("Received suggestions:", suggestions.length, suggestions);
      const viewModels = suggestions.map(toViewModel);

      dispatch({ type: "SET_CLUSTERS", payload: viewModels });

      const successMsg = `Generated ${viewModels.length} cluster suggestion${viewModels.length !== 1 ? "s" : ""}`;
      toast.success("AI Clusters Generated", {
        description: successMsg,
      });
    } catch (err) {
      console.error("Generate AI clusters error:", err);
      // Network errors or other unexpected errors
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Failed to generate AI clusters", {
        description: message.includes("fetch") ? "Network error. Please check your connection and try again." : message,
      });
    } finally {
      dispatch({ type: "SET_GENERATING", payload: false });
    }
  }, []);

  const setClusters = useCallback((clusters: AIClusterViewModel[]) => {
    dispatch({ type: "SET_CLUSTERS", payload: clusters });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SELECT", payload: id });
  }, []);

  const selectAll = useCallback(() => {
    dispatch({ type: "SELECT_ALL" });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    dispatch({ type: "RENAME_CLUSTER", payload: { id, name } });
  }, []);

  const updateClusterQueries = useCallback((id: string, queries: QueryDto[]) => {
    dispatch({ type: "UPDATE_CLUSTER_QUERIES", payload: { id, queries } });
  }, []);

  const discard = useCallback((id: string) => {
    dispatch({ type: "DISCARD_CLUSTER", payload: id });
  }, []);

  const acceptSelected = useCallback(async () => {
    const selectedClusters = state.clusters.filter((c) => state.selectedIds.has(c.id));

    // Validation: ensure all selected clusters are valid
    const invalidClusters = selectedClusters.filter(
      (c) => !c.name.trim() || c.name.trim().length > 120 || c.queries.length === 0
    );

    if (invalidClusters.length > 0) {
      toast.error("Invalid clusters selected", {
        description: "All clusters must have a name (1-120 chars) and at least one query.",
      });
      return;
    }

    if (selectedClusters.length === 0) {
      toast.error("No clusters selected", {
        description: "Please select at least one cluster to accept.",
      });
      return;
    }

    dispatch({ type: "SET_ACCEPTING", payload: true });
    dispatch({ type: "SET_LIVE_MESSAGE", payload: "Accepting selected clusters..." });

    try {
      const requestBody: AcceptClustersRequestDto = {
        clusters: selectedClusters.map((c) => ({
          name: c.name.trim(),
          queryIds: c.queries.map((q) => q.id),
        })),
      };

      const response = await fetch("/api/ai-clusters/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication required", {
            description: "Redirecting to login...",
          });
          setTimeout(() => {
            window.location.href = "/login?returnUrl=/ai-clusters";
          }, 1000);
          return;
        }

        if (response.status === 400) {
          const errorData = await response.json();
          toast.error("Validation error", {
            description: errorData.error?.message || "Some clusters are invalid.",
          });
          return;
        }

        throw new Error(`Failed to accept clusters: ${response.statusText}`);
      }

      const result = await response.json();
      const successMsg = `Created ${result.groups.length} group${result.groups.length !== 1 ? "s" : ""}`;

      toast.success("Clusters Accepted", {
        description: successMsg,
      });

      // Navigate to groups page
      setTimeout(() => {
        window.location.href = "/groups";
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to accept clusters", {
        description: message,
      });
    } finally {
      dispatch({ type: "SET_ACCEPTING", payload: false });
    }
  }, [state.clusters, state.selectedIds]);

  const value: AIClustersContextValue = {
    clusters: state.clusters,
    selectedIds: state.selectedIds,
    isGenerating: state.isGenerating,
    isAccepting: state.isAccepting,
    liveMessage: state.liveMessage,
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
