import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface OpportunityToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function OpportunityToggle({ checked, onChange }: OpportunityToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="opportunity-filter"
        checked={checked}
        onCheckedChange={onChange}
        aria-label="Show only opportunity queries"
      />
      <Label
        htmlFor="opportunity-filter"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        Opportunities only
      </Label>
    </div>
  );
}
