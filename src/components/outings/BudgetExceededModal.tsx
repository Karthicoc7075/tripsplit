import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

interface BudgetExceededModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outingName: string;
  budget: number;
  totalSpent: number;
  /** When true, show Cancel + "add anyway" for adding expenses over budget. */
  allowContinue?: boolean;
  onContinue?: () => void;
}

export function BudgetExceededModal({
  open,
  onOpenChange,
  outingName,
  budget,
  totalSpent,
  allowContinue = false,
  onContinue,
}: BudgetExceededModalProps) {
  const overBy = totalSpent - budget;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-destructive/30">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive">Trip budget exceeded</DialogTitle>
              <DialogDescription className="mt-2 text-left">
                <strong>{outingName}</strong> has gone over its budget.
                {allowContinue
                  ? " You can cancel or add this expense anyway."
                  : " Review spending with your group before adding more expenses."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-semibold">{formatCurrency(budget)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total spent</span>
            <span className="font-semibold text-destructive">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="flex justify-between border-t border-destructive/20 pt-2">
            <span className="font-medium text-destructive">Over budget by</span>
            <span className="font-bold text-destructive">{formatCurrency(overBy)}</span>
          </div>
        </div>

        <DialogFooter className={allowContinue ? "flex-col-reverse sm:flex-row gap-2" : undefined}>
          {allowContinue ? (
            <>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  onOpenChange(false);
                  onContinue?.();
                }}
              >
                It&apos;s OK — add anyway
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}