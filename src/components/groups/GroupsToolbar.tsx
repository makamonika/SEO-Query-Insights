import { SearchInput } from "@/components/queries/SearchInput";
import { GroupWithAIButton } from "@/components/queries/GroupWithAIButton";

interface GroupsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onGenerateAI: () => void;
  isGeneratingAI: boolean;
}

export function GroupsToolbar({ search, onSearchChange, onGenerateAI, isGeneratingAI }: GroupsToolbarProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <SearchInput value={search} onChange={onSearchChange} placeholder="Search groups..." />
      <GroupWithAIButton onGenerate={onGenerateAI} isGenerating={isGeneratingAI} />
    </div>
  );
}
