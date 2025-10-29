import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { GroupWithAIButton } from "@/components/queries/GroupWithAIButton";

export interface ClustersToolbarProps {
  selectedCount: number;
  totalCount: number;
  onRegenerate: () => Promise<void>;
  onAcceptSelected: () => Promise<void>;
  isGenerating: boolean;
  isAccepting: boolean;
  hasValidSelection: boolean;
}

/**
 * Toolbar for AI Clusters page with regenerate and accept actions
 */
export function ClustersToolbar({
  selectedCount,
  totalCount,
  onRegenerate,
  onAcceptSelected,
  isGenerating,
  isAccepting,
  hasValidSelection,
}: ClustersToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <GroupWithAIButton onGenerate={onRegenerate} isGenerating={isGenerating || isAccepting} />

        {selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedCount} of {totalCount} selected
          </span>
        )}
      </div>

      <Button
        onClick={onAcceptSelected}
        disabled={!hasValidSelection || isGenerating || isAccepting}
        variant="default"
        aria-busy={isAccepting}
      >
        {isAccepting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Accepting...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Accept Selected ({selectedCount})
          </>
        )}
      </Button>
    </div>
  );
}
