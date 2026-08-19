import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataErrorStateProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

/**
 * Shown when the Firestore subscription fails.
 *
 * Without it a page falls through to its empty state and tells someone whose
 * data just failed to load that they have no data — the most misleading thing
 * the app can say. Every page that reads DataContext uses this.
 */
export function DataErrorState({ message, onRetry, className }: DataErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "fintech-card flex flex-col items-center gap-3 p-8 text-center",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div>
        <p className="font-semibold text-foreground">Couldn&apos;t load your data</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button className="mt-1 h-11 gap-2" onClick={onRetry}>
        <RefreshCw size={16} /> Try again
      </Button>
    </div>
  );
}
