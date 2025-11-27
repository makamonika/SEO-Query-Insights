import { useCallback } from "react";
import { toast } from "sonner";
import type { AiClusterSuggestionDto } from "@/types";
import { AIClustersClientService } from "@/lib/services/ai-clusters-client.service";
import type { AIClusterViewModel } from "./useAIClustersSuggestions";
import type { Action } from "./useAIClustersState";

/**
 * Actions hook for AI Clusters
 * Handles generate and accept operations
 */

/**
 * Generates a stable client-side ID for a cluster based on its content
 */
function generateClusterId(suggestion: AiClusterSuggestionDto): string {
  const queryIds = suggestion.queries.map((q) => q.id).sort();
  const content = `${suggestion.name}:${queryIds.join(",")}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
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

export interface UseAIClustersActionsParams {
  dispatch: React.Dispatch<Action>;
}

export interface UseAIClustersActionsReturn {
  generate: () => Promise<void>;
  acceptSelected: (clusters: AIClusterViewModel[], selectedIds: Set<string>) => Promise<void>;
}

export function useAIClustersActions({ dispatch }: UseAIClustersActionsParams): UseAIClustersActionsReturn {
  const generate = useCallback(async () => {
    dispatch({ type: "SET_GENERATING", payload: true });
    dispatch({ type: "SET_LIVE_MESSAGE", payload: "Generating AI clusters..." });

    try {
      const { success, data, error } = await AIClustersClientService.generateClusters();

      if (!success || !data) {
        toast.error("Failed to generate AI clusters", {
          description: error || "An unexpected error occurred",
        });
        return;
      }

      const viewModels = data.map(toViewModel);
      dispatch({ type: "SET_CLUSTERS", payload: viewModels });

      const successMsg = `Generated ${viewModels.length} cluster suggestion${viewModels.length !== 1 ? "s" : ""}`;
      toast.success("AI Clusters Generated", {
        description: successMsg,
      });
    } catch (err) {
      console.error("Generate AI clusters error:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Failed to generate AI clusters", {
        description: message.includes("fetch") ? "Network error. Please check your connection and try again." : message,
      });
    } finally {
      dispatch({ type: "SET_GENERATING", payload: false });
    }
  }, [dispatch]);

  const acceptSelected = useCallback(
    async (clusters: AIClusterViewModel[], selectedIds: Set<string>) => {
      const selectedClusters = clusters.filter((c) => selectedIds.has(c.id));

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
        const clustersToAccept = selectedClusters.map((c) => ({
          name: c.name.trim(),
          queryIds: c.queries.map((q) => q.id),
        }));

        const { success, data, error } = await AIClustersClientService.acceptClusters(clustersToAccept);

        if (!success || !data) {
          toast.error("Failed to accept clusters", {
            description: error || "An unexpected error occurred",
          });
          return;
        }

        const successMsg = `Created ${data.length} group${data.length !== 1 ? "s" : ""}`;
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
    },
    [dispatch]
  );

  return {
    generate,
    acceptSelected,
  };
}
