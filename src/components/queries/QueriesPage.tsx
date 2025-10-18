import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "./PageHeader";
import { QueriesTableWithControls } from "./QueriesTableWithControls";
import { LiveRegion } from "./LiveRegion";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQueries } from "@/hooks/useQueries";
import { useSelection } from "@/hooks/useSelection";
import { useImport } from "@/hooks/useImport";
import { useImportStatus } from "@/hooks/useImportStatus";
import type { QuerySortField, SortOrder } from "@/types";

export function QueriesPage() {
  // Live region for accessibility announcements
  const [liveMessage, setLiveMessage] = useState<string>();

  // Filter and sort state
  const [search, setSearch] = useState("");
  const [isOpportunity, setIsOpportunity] = useState<boolean>();
  const [sortBy, setSortBy] = useState<QuerySortField>("impressions");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [limit] = useState(100);
  const [offset] = useState(0);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch queries
  const {
    data: queries,
    isLoading,
    error,
    refetch,
  } = useQueries({
    search: debouncedSearch,
    isOpportunity,
    sortBy,
    order,
    limit,
    offset,
  });

  // Selection management
  const { selected, toggleRow, clearSelection } = useSelection();

  // Import management - separated from main component logic
  const { isImporting, lastImportAt, hasFailed, handleImport, setLastImportAt } = useImport(refetch, setLiveMessage);

  // Fetch initial import status on mount
  const importStatus = useImportStatus();

  // Set initial lastImportAt when status loads
  useEffect(() => {
    if (importStatus.lastImportAt && !lastImportAt) {
      setLastImportAt(importStatus.lastImportAt);
    }
  }, [importStatus.lastImportAt, lastImportAt, setLastImportAt]);

  // Toolbar handlers - memoized to prevent unnecessary re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleOpportunityToggle = useCallback((checked: boolean) => {
    setIsOpportunity(checked);
  }, []);

  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: QuerySortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
    },
    []
  );

  const handleOpenNewGroup = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

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
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#queries-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <PageHeader lastImportAt={lastImportAt} isImporting={isImporting} hasFailed={hasFailed} onImport={handleImport} />

      <div className="container mx-auto px-4 py-8">
        <QueriesTableWithControls
          rows={queries}
          isLoading={isLoading}
          search={search}
          isOpportunity={isOpportunity}
          onSearchChange={handleSearchChange}
          onOpportunityToggle={handleOpportunityToggle}
          sortBy={sortBy}
          order={order}
          onSortChange={handleSortChange}
          selected={selected}
          onToggleRow={toggleRow}
          onOpenNewGroup={handleOpenNewGroup}
          onGenerateAI={handleGenerateAI}
          isGeneratingAI={isGeneratingAI}
        />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800" role="alert">
            Error: {error.message}
          </div>
        )}

        {/* TODO: Add GroupCreateModal */}
      </div>

      <LiveRegion message={liveMessage} />
    </div>
  );
}
