import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ImportRunResultDto } from "@/types";

export interface UseImportResult {
  isImporting: boolean;
  lastImportAt?: string;
  hasFailed: boolean;
  handleImport: () => Promise<void>;
  setLastImportAt: (date: string | undefined) => void;
}

/**
 * Custom hook to manage data import operations
 * @param onSuccess - Callback to execute after successful import (e.g., refetch data)
 * @param onLiveMessage - Callback to announce status to screen readers
 * @returns Import state and handlers
 */
export function useImport(onSuccess?: () => void, onLiveMessage?: (message: string) => void): UseImportResult {
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportAt, setLastImportAt] = useState<string>();
  const [hasFailed, setHasFailed] = useState(false);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setHasFailed(false);
    onLiveMessage?.("Starting data import...");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login?returnUrl=" + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result: ImportRunResultDto = await response.json();

      if (result.status === "completed") {
        setLastImportAt(result.completedAt);
        setHasFailed(false);
        const successMsg = `Import completed successfully. ${result.rowCount} queries imported.`;
        toast.success(successMsg);
        onLiveMessage?.(successMsg);
        onSuccess?.();
      } else {
        const errorMsg = result.error?.message || "Import failed";
        setHasFailed(true);
        toast.error("Import failed", {
          description: errorMsg,
        });
        onLiveMessage?.(`Import failed: ${errorMsg}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setHasFailed(true);
      toast.error("Import failed", {
        description: message,
      });
      onLiveMessage?.(`Import failed: ${message}`);
    } finally {
      setIsImporting(false);
    }
  }, [onSuccess, onLiveMessage]);

  return {
    isImporting,
    lastImportAt,
    hasFailed,
    handleImport,
    setLastImportAt,
  };
}
