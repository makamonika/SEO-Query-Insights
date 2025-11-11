interface TableEmptyStateProps {
  message: string;
}

export function TableEmptyState({ message }: TableEmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
