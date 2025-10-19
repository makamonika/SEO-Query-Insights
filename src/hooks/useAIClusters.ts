import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UseAIClustersParams {
  setLiveMessage: (message: string) => void;
}

export interface UseAIClustersResult {
  isGeneratingAI: boolean;
  handleGenerateAI: () => Promise<void>;
}

/**
 * Custom hook to manage AI cluster generation
 * @param params - Callback for updating live region messages
 * @returns AI generation handler and loading state
 */
export function useAIClusters({ setLiveMessage }: UseAIClustersParams): UseAIClustersResult {
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
        throw new Error(`Failed to generate clusters: ${response.statusText}`);
      }

      const suggestions = await response.json();
      const successMsg = `Generated ${suggestions.length} cluster suggestions`;
      toast.success("AI Clusters Generated", {
        description: successMsg,
      });
      setLiveMessage(successMsg);

      // TODO: Navigate to /ai-clusters with suggestions in state
      console.log("AI Clusters generated:", suggestions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to generate AI clusters", {
        description: message,
      });
      setLiveMessage(`Failed to generate clusters: ${message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [setLiveMessage]);

  return {
    isGeneratingAI,
    handleGenerateAI,
  };
}

