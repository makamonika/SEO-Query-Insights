import { useEffect, useState } from "react";

export interface ImportStatus {
  lastImportAt?: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches the last import status/timestamp from the backend
 * This could be implemented as a new endpoint or derived from queries metadata
 * For MVP, we'll check if we have any queries and infer from that
 */
export function useImportStatus(): ImportStatus {
  const [lastImportAt, setLastImportAt] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // For MVP: Try to fetch a single query to check if we have data
        // In production, this should be a dedicated /api/import/status endpoint
        const response = await fetch("/api/queries?limit=1");

        if (response.ok) {
          const responseData = await response.json();
          // If we have queries, check the most recent one's timestamp
          // API returns { data: [...], meta: {...} }
          if (responseData?.data && responseData.data.length > 0 && responseData.data[0].createdAt) {
            setLastImportAt(responseData.data[0].createdAt);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch import status"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { lastImportAt, isLoading, error };
}
