import { useState, useMemo } from "react";
import { PageHeader } from "./PageHeader";
import { QueriesTableWithControls } from "./QueriesTableWithControls";
import { LiveRegion } from "./LiveRegion";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { Pagination } from "@/components/ui/pagination";
import { useQuerySearch } from "@/hooks/useQuerySearch";
import { useQueriesPageActions } from "@/hooks/useQueriesPageActions";

export function QueriesPage() {
  // Live region for accessibility announcements
  const [liveMessage, setLiveMessage] = useState<string>();

  // Query search, filter, sort, pagination, and selection
  const querySearch = useQuerySearch({
    enablePagination: true,
    initialPageSize: 50,
    initialSortBy: "impressions",
    initialOrder: "desc",
  });

  // Page-specific actions (import, AI generation, group creation)
  const actions = useQueriesPageActions({
    refetch: querySearch.refetch,
    setLiveMessage,
    selectedIds: querySearch.selected,
    clearSelection: querySearch.clearSelection,
  });

  // Get selected queries for modal display (showing query texts)
  const selectedQueries = useMemo(() => {
    return querySearch.queries.filter((q) => querySearch.selected.has(q.id));
  }, [querySearch.queries, querySearch.selected]);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#queries-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <PageHeader
        lastImportAt={actions.importStatusLastImportAt || actions.lastImportAt || undefined}
        isImporting={actions.isImporting}
        hasFailed={actions.hasFailed}
        onImport={actions.handleImport}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <QueriesTableWithControls
            rows={querySearch.queries}
            isLoading={querySearch.isLoading}
            search={querySearch.search}
            isOpportunity={querySearch.isOpportunity}
            onSearchChange={querySearch.setSearch}
            onOpportunityToggle={(checked: boolean) => querySearch.setIsOpportunity(checked)}
            sortBy={querySearch.sortBy}
            order={querySearch.order}
            onSortChange={querySearch.handleSortChange}
            selected={querySearch.selected}
            onToggleRow={querySearch.toggleRow}
            onOpenNewGroup={actions.handleOpenNewGroup}
            onGenerateAI={actions.handleGenerateAI}
            isGeneratingAI={actions.isGeneratingAI}
          />

          {/* Pagination */}
          {!querySearch.isLoading && querySearch.queries.length > 0 && (
            <Pagination
              meta={querySearch.meta}
              onPageChange={querySearch.handlePageChange}
              onPageSizeChange={querySearch.handlePageSizeChange}
              pageSizeOptions={[25, 50, 100, 200]}
              isLoading={querySearch.isLoading}
            />
          )}

          {querySearch.error && (
            <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800" role="alert">
              Error: {querySearch.error.message}
            </div>
          )}
        </div>

        <CreateGroupModal
          open={actions.isCreateModalOpen}
          onOpenChange={actions.setIsCreateModalOpen}
          onCreate={actions.handleCreateGroup}
          isSubmitting={actions.isCreatingGroup}
          error={actions.createGroupError || undefined}
          queries={selectedQueries}
        />
      </div>

      <LiveRegion message={liveMessage} />
    </div>
  );
}
