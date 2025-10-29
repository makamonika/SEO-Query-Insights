import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AiClusterSuggestionDto } from "@/types";

export interface UseAIClustersParams {
  setLiveMessage: (message: string) => void;
  onSuggestionsGenerated?: (suggestions: AiClusterSuggestionDto[]) => void;
  navigateToAIClusters?: boolean;
}

export interface UseAIClustersResult {
  isGeneratingAI: boolean;
  handleGenerateAI: () => Promise<void>;
}

/**
 * Custom hook to manage AI cluster generation
 * @param params - Callback for updating live region messages and handling suggestions
 * @returns AI generation handler and loading state
 */
export function useAIClusters({
  setLiveMessage,
  onSuggestionsGenerated,
  navigateToAIClusters = false,
}: UseAIClustersParams): UseAIClustersResult {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAI = useCallback(async () => {
    setIsGeneratingAI(true);
    setLiveMessage("Generating AI clusters...");

    try {
      const response = await fetch("/api/ai-clusters");

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication required", {
            description: "Redirecting to login...",
          });
          setTimeout(() => {
            window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
          }, 1000);
          return;
        }

        if (response.status === 429) {
          toast.error("Rate limited", {
            description: "Too many requests. Please try again in a minute.",
          });
          setLiveMessage("Rate limited. Try again later.");
          return;
        }

        throw new Error(`Failed to generate clusters: ${response.statusText}`);
      }

      const suggestions: AiClusterSuggestionDto[] = await response.json();
      const successMsg = `Generated ${suggestions.length} cluster suggestion${suggestions.length !== 1 ? "s" : ""}`;
      toast.success("AI Clusters Generated", {
        description: successMsg,
      });
      setLiveMessage(successMsg);

      // Call the callback if provided (for injecting into context)
      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(suggestions);
      }

      // Navigate to /ai-clusters if requested
      if (navigateToAIClusters) {
        setTimeout(() => {
          window.location.href = "/ai-clusters";
        }, 500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to generate AI clusters", {
        description: message,
      });
      setLiveMessage(`Failed to generate clusters: ${message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [setLiveMessage, onSuggestionsGenerated, navigateToAIClusters]);

  return {
    isGeneratingAI,
    handleGenerateAI,
  };
}
