import { useEffect } from "react";
import { AIClustersProvider, useAIClustersSuggestions } from "@/hooks/useAIClustersSuggestions";
import { useClustersPageModals } from "@/hooks/useClustersPageModals";
import { ClustersToolbar } from "./ClustersToolbar";
import { ClustersList } from "./ClustersList";
import { EditClusterModal } from "./EditClusterModal";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";
import { LiveRegion } from "@/components/queries/LiveRegion";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Inner page content that consumes the AI clusters context
 */
function ClustersPageContent() {
  const {
    clusters,
    selectedIds,
    isGenerating,
    isAccepting,
    liveMessage,
    hasValidSelection,
    generate,
    toggleSelect,
    selectAll,
    clearSelection,
    rename,
    updateClusterQueries,
    discard,
    acceptSelected,
  } = useAIClustersSuggestions();

  // Modal management
  const modals = useClustersPageModals({
    clusters,
    rename,
    updateClusterQueries,
    discard,
  });

  // Auto-generate on mount if no clusters
  useEffect(() => {
    if (clusters.length === 0 && !isGenerating) {
      generate();
    }
  }, []);

  // Generating state (first time)
  if (isGenerating && clusters.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Generating AI cluster suggestions...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
        <LiveRegion message={liveMessage} />
      </div>
    );
  }

  // Empty state (no clusters after generation)
  if (clusters.length === 0 && !isGenerating) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Cluster Suggestions</h1>
          <p className="text-muted-foreground mt-2">Review and accept AI-generated query clusters</p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 border rounded-lg bg-muted/20">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">No Cluster Suggestions</h2>
            <p className="text-muted-foreground max-w-md">
              No AI cluster suggestions were generated. This could be because there are not enough queries or patterns
              to cluster.
            </p>
          </div>
          <Button onClick={generate} disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>

        <LiveRegion message={liveMessage} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Cluster Suggestions</h1>
        <p className="text-muted-foreground mt-2">
          Review AI-generated query clusters. Edit names and membership, then accept the ones you want to keep.
        </p>
      </div>

      {/* Toolbar */}
      <ClustersToolbar
        selectedCount={selectedIds.size}
        totalCount={clusters.length}
        onRegenerate={generate}
        onAcceptSelected={acceptSelected}
        isGenerating={isGenerating}
        isAccepting={isAccepting}
        hasValidSelection={hasValidSelection}
      />

      {/* Clusters List */}
      <ClustersList
        clusters={clusters}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onOpenEdit={modals.handleOpenEdit}
        onDiscard={modals.handleOpenDiscard}
        onRename={rename}
        onUpdateQueries={updateClusterQueries}
      />

      {/* Edit Modal */}
      <EditClusterModal
        open={modals.editingClusterId !== null}
        cluster={modals.editingCluster}
        onClose={modals.handleCloseEdit}
        onSave={modals.handleSaveEdit}
      />

      {/* Discard Confirmation */}
      <ConfirmDialog
        open={modals.discardingClusterId !== null}
        title="Discard Cluster?"
        description={
          modals.discardingCluster
            ? `Are you sure you want to discard "${modals.discardingCluster.name}"? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Discard"
        onConfirm={modals.handleConfirmDiscard}
        onOpenChange={(open) => !open && modals.handleCloseDiscard()}
      />

      {/* Live Region for screen readers */}
      <LiveRegion message={liveMessage} />
    </div>
  );
}

/**
 * Main entry component for AI Clusters Suggestions view
 * Wraps the page content with AIClustersProvider
 */
export function ClustersPage() {
  return (
    <AIClustersProvider>
      <ClustersPageContent />
    </AIClustersProvider>
  );
}
