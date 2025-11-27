import type { AiClusterSuggestionDto, AcceptClusterDto, GroupDto } from "@/types";

/**
 * Client-side service for AI Clusters API calls
 * Handles HTTP requests to /api/ai-clusters endpoints
 */
export const AIClustersClientService = {
  /**
   * Generate AI cluster suggestions
   */
  async generateClusters(): Promise<{
    success: boolean;
    data?: AiClusterSuggestionDto[];
    error?: string;
  }> {
    try {
      const response = await fetch("/api/ai-clusters/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const clusters: AiClusterSuggestionDto[] = await response.json();
      return { success: true, data: clusters };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },

  /**
   * Accept selected clusters and create groups
   */
  async acceptClusters(clusters: AcceptClusterDto[]): Promise<{ success: boolean; data?: GroupDto[]; error?: string }> {
    try {
      const response = await fetch("/api/ai-clusters/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clusters }),
      });

      if (!response.ok) {
        return { success: false, error: response.statusText };
      }

      const createdGroups: GroupDto[] = await response.json();
      return { success: true, data: createdGroups };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
};
