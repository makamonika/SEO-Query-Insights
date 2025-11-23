import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AiClusterSuggestionDto } from "@/types";
import { parseErrorResponse, getErrorMessage } from "@/lib/api-error-handler";

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
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);

    if (navigateToAIClusters) {
      setLiveMessage("Opening AI clusters...");
      setIsGeneratingAI(false);
      window.location.href = "/ai-clusters";
      return;
    }

    setLiveMessage("Generating AI clusters...");

    try {
      const response = await fetch("/api/ai-clusters");

      if (!response.ok) {
        const errorResponse = await parseErrorResponse(response);
        const errorMessage = getErrorMessage(errorResponse, `Failed to generate clusters: ${response.statusText}`);

        // Handle specific error codes with user-friendly messages
        if (response.status === 401) {
          toast.error("Authentication required", {
            description: "Redirecting to login...",
          });
          setTimeout(() => {
            window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.href);
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
      const successMsg = `Generated ${suggestions.length} cluster suggestion${suggestions.length !== 1 ? "s" : ""}`;
      toast.success("AI Clusters Generated", {
        description: successMsg,
      });

      // Call the callback if provided (for injecting into context)
      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(suggestions);
      }
    } catch (err) {
      // Network errors or other unexpected errors
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error("Failed to generate AI clusters", {
        description: message.includes("fetch") ? "Network error. Please check your connection and try again." : message,
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [setLiveMessage, onSuggestionsGenerated, navigateToAIClusters, isGeneratingAI]);

  return {
    isGeneratingAI,
    handleGenerateAI,
  };
}
