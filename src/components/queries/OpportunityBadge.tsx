import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface OpportunityBadgeProps {
  isOpportunity: boolean;
}

/**
 * Visual indicator for opportunity queries (high impressions, low CTR)
 */
export function OpportunityBadge({ isOpportunity }: OpportunityBadgeProps) {
  if (!isOpportunity) {
    return null;
  }

  return (
    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      <TrendingUp className="mr-1 h-3 w-3" />
      Opportunity
    </Badge>
  );
}
