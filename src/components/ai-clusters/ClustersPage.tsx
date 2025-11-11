import { useEffect, useState, useMemo } from "react";
import { AIClustersProvider, useAIClustersSuggestions } from "@/hooks/useAIClustersSuggestions";
import { ClustersToolbar } from "./ClustersToolbar";
import { ClustersList } from "./ClustersList";
import { EditClusterModal } from "./EditClusterModal";
import { ConfirmDialog } from "@/components/groups/ConfirmDialog";
import { LiveRegion } from "@/components/queries/LiveRegion";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueryDto } from "@/types";

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
    generate,
    toggleSelect,
    selectAll,
    clearSelection,
    rename,
    updateClusterQueries,
    discard,
    acceptSelected,
  } = useAIClustersSuggestions();

  // Modal states
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [discardingClusterId, setDiscardingClusterId] = useState<string | null>(null);

  // Auto-generate on mount if no clusters
  useEffect(() => {
    if (clusters.length === 0 && !isGenerating) {
      generate();
    }
  }, []);

  // Validation: check if selected clusters are valid
  const hasValidSelection = useMemo(() => {
    if (selectedIds.size === 0) return false;

    const selectedClusters = clusters.filter((c) => selectedIds.has(c.id));
    return selectedClusters.every(
      (c) => c.name.trim().length > 0 && c.name.trim().length <= 120 && c.queries.length > 0
    );
  }, [clusters, selectedIds]);

  const handleOpenEdit = (id: string) => {
    setEditingClusterId(id);
  };

  const handleCloseEdit = () => {
    setEditingClusterId(null);
  };

  const handleSaveEdit = (changes: { name: string; queries: QueryDto[] }) => {
    if (editingClusterId) {
      rename(editingClusterId, changes.name);
      updateClusterQueries(editingClusterId, changes.queries);
    }
    setEditingClusterId(null);
  };

  const handleOpenDiscard = (id: string) => {
    setDiscardingClusterId(id);
  };

  const handleConfirmDiscard = () => {
    if (discardingClusterId) {
      discard(discardingClusterId);
    }
    setDiscardingClusterId(null);
  };

  const editingCluster = editingClusterId ? clusters.find((c) => c.id === editingClusterId) || null : null;
  const discardingCluster = discardingClusterId ? clusters.find((c) => c.id === discardingClusterId) || null : null;

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
        onOpenEdit={handleOpenEdit}
        onDiscard={handleOpenDiscard}
        onRename={rename}
        onUpdateQueries={updateClusterQueries}
      />

      {/* Edit Modal */}
      <EditClusterModal
        open={editingClusterId !== null}
        cluster={editingCluster}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />

      {/* Discard Confirmation */}
      <ConfirmDialog
        open={discardingClusterId !== null}
        title="Discard Cluster?"
        description={
          discardingCluster
            ? `Are you sure you want to discard "${discardingCluster.name}"? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Discard"
        onConfirm={handleConfirmDiscard}
        onOpenChange={(open) => !open && setDiscardingClusterId(null)}
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
