import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, CheckIcon, XIcon, Trash2Icon, SparklesIcon, Edit2Icon } from "lucide-react";
import { MetricsSummary } from "@/components/groups/MetricsSummary";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { sortQueries } from "@/lib/query-sorting";
import { useInlineNameEdit } from "@/hooks/useInlineNameEdit";
import type { AIClusterViewModel } from "@/hooks/useAIClustersSuggestions";
import type { QueryDto, QuerySortField, SortOrder } from "@/types";

export interface ClusterCardProps {
  cluster: AIClusterViewModel;
  isSelected: boolean;
  queries: QueryDto[];
  onToggleSelect: () => void;
  onOpenEdit: () => void;
  onDiscard: () => void;
  onRename: (name: string) => void;
  onRemoveQuery?: (queryId: string) => void;
}

/**
 * Card displaying a single AI cluster suggestion with inline editing
 */
export function ClusterCard({
  cluster,
  isSelected,
  queries,
  onToggleSelect,
  onOpenEdit,
  onDiscard,
  onRename,
  onRemoveQuery,
}: ClusterCardProps) {
  const [sortBy, setSortBy] = useState<QuerySortField>("impressions");
  const [order, setOrder] = useState<SortOrder>("desc");

  // Use shared inline name editing hook
  const { isEditing, editedName, error, startEdit, cancelEdit, saveEdit, setEditedName } = useInlineNameEdit({
    initialName: cluster.name,
    onSave: onRename,
    maxLength: 120,
  });

  const handleSortChange = useCallback((params: { sortBy: QuerySortField; order: SortOrder }) => {
    setSortBy(params.sortBy);
    setOrder(params.order);
  }, []);

  // Sort queries locally using shared sorting logic
  const sortedQueries = useMemo(() => {
    return sortQueries(queries, sortBy, order);
  }, [queries, sortBy, order]);

  const isValid = cluster.name.trim().length > 0 && cluster.name.trim().length <= 120 && cluster.queries.length > 0;

  return (
    <div
      className={`rounded-lg border bg-card p-6 shadow-sm transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${!isValid ? "border-destructive" : ""}`}
    >
      {/* Header with selection and title */}
      <div className="flex items-start gap-4 mb-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select cluster: ${cluster.name}`}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  aria-label="Cluster name"
                  aria-invalid={!!error}
                  className="text-xl font-bold h-auto py-2"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveEdit}
                  disabled={!editedName.trim() || editedName.trim() === cluster.name}
                  aria-label="Save cluster name"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit} aria-label="Cancel editing">
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold break-words">{cluster.name}</h3>
              <Badge variant="secondary" className="gap-1">
                <SparklesIcon className="size-3" />
                AI Generated
              </Badge>
              {cluster.isDirty && (
                <Badge variant="outline" className="text-xs">
                  Edited
                </Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={startEdit}
                aria-label="Edit cluster name"
                className="h-8 w-8"
              >
                <PencilIcon className="h-3 w-3" />
              </Button>
            </div>
          )}

          {!isValid && (
            <p className="text-sm text-destructive mt-1" role="alert">
              Cluster must have a name (1-120 chars) and at least one query
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onOpenEdit} aria-label="Edit cluster membership">
            <Edit2Icon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={onDiscard} aria-label="Discard cluster">
            <Trash2Icon className="h-4 w-4 mr-1" />
            Discard
          </Button>
        </div>
      </div>

      {/* Metrics Summary */}
      <MetricsSummary
        queryCount={cluster.queryCount}
        metricsImpressions={cluster.metricsImpressions}
        metricsClicks={cluster.metricsClicks}
        metricsCtr={cluster.metricsCtr}
        metricsAvgPosition={cluster.metricsAvgPosition}
      />

      {/* Queries Table */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Member Queries ({queries.length})</h4>
        <QueriesTable
          rows={sortedQueries}
          isLoading={false}
          emptyMessage="No queries in this cluster"
          sortBy={sortBy}
          order={order}
          onSortChange={handleSortChange}
          maxHeight="400px"
          renderActions={
            onRemoveQuery
              ? (row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveQuery(row.id)}
                    aria-label={`Remove query: ${row.queryText}`}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                )
              : undefined
          }
        />
      </div>
    </div>
  );
}
