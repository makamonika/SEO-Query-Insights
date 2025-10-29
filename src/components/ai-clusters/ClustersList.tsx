import { ClusterCard } from "./ClusterCard";
import { Checkbox } from "@/components/ui/checkbox";
import type { AIClusterViewModel } from "@/hooks/useAIClustersSuggestions";
import type { QueryDto } from "@/types";

export interface ClustersListProps {
  clusters: AIClusterViewModel[];
  selectedIds: Set<string>;
  queriesById: Map<string, QueryDto>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenEdit: (id: string) => void;
  onDiscard: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemoveQuery: (clusterId: string, queryId: string) => void;
}

/**
 * Grid/list of cluster cards with select-all functionality
 */
export function ClustersList({
  clusters,
  selectedIds,
  queriesById,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpenEdit,
  onDiscard,
  onRename,
  onRemoveQuery,
}: ClustersListProps) {
  const allSelected = clusters.length > 0 && selectedIds.size === clusters.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < clusters.length;

  const handleSelectAllChange = () => {
    if (allSelected || someSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  return (
    <div>
      {/* Select All Header */}
      {clusters.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-lg border bg-muted/30">
          <Checkbox
            checked={allSelected || someSelected}
            onCheckedChange={handleSelectAllChange}
            aria-label="Select all clusters"
          />
          <span className="text-sm font-medium">
            {allSelected ? "Deselect all" : someSelected ? `${selectedIds.size} selected` : "Select all"}
          </span>
        </div>
      )}

      {/* Clusters Grid */}
      <div className="grid gap-6">
        {clusters.map((cluster) => {
          // Resolve queries for this cluster
          const queries = cluster.queryIds
            .map((qid) => queriesById.get(qid))
            .filter((q): q is QueryDto => q !== undefined);

          return (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              isSelected={selectedIds.has(cluster.id)}
              queries={queries}
              onToggleSelect={() => onToggleSelect(cluster.id)}
              onOpenEdit={() => onOpenEdit(cluster.id)}
              onDiscard={() => onDiscard(cluster.id)}
              onRename={(name) => onRename(cluster.id, name)}
              onRemoveQuery={(queryId) => onRemoveQuery(cluster.id, queryId)}
            />
          );
        })}
      </div>
    </div>
  );
}
