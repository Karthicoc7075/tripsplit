import { CheckCircle2, PiggyBank, AlertTriangle, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { formatOutingDates, getBudgetOutcome, daysSinceOutingEnded } from "@/lib/outing";
import { cn } from "@/lib/utils";
import type { Outing } from "@/types";

/** One open return the signed-in user is a party to. */
export interface OpenReturn {
  name: string;
  amount: number;
  youAreOwed: boolean;
}

interface OutingCompleteCardProps {
  outing: Outing;
  totalSpent: number;
  /**
   * The current user's own open returns — never the whole outing's.
   *
   * In a three-way outing where two people paid, the third owes both of them:
   * that is two edges, but only the ones touching the reader are their problem.
   * Counting all of them told a settled-up member they still owed money.
   */
  myReturns: OpenReturn[];
}

/** "You owe ₹450 to Arun · ₹300 coming back from Priya" — from the reader's side only. */
function returnsSummary(myReturns: OpenReturn[]): string {
  if (myReturns.length === 0) return "You're all settled up in this outing.";

  const owing = myReturns.filter((r) => !r.youAreOwed);
  const owed = myReturns.filter((r) => r.youAreOwed);
  const total = (list: OpenReturn[]) => list.reduce((sum, r) => sum + r.amount, 0);
  const who = (list: OpenReturn[]) =>
    list.length === 1 ? list[0].name : `${list.length} people`;

  const parts: string[] = [];
  if (owing.length > 0) parts.push(`You owe ${formatCurrency(total(owing))} to ${who(owing)}`);
  if (owed.length > 0) parts.push(`${formatCurrency(total(owed))} coming back from ${who(owed)}`);

  return `${parts.join(" · ")} — settling up closes your books.`;
}

/** "ended today" / "ended yesterday" / "ended 6 days ago". */
function endedLabel(outing: Outing): string {
  const days = daysSinceOutingEnded(outing);
  if (days == null) return "Completed";
  if (days <= 0) return "Ended today";
  if (days === 1) return "Ended yesterday";
  if (days < 30) return `Ended ${days} days ago`;
  const dates = formatOutingDates(outing);
  return dates ? `Ended ${dates.split("–").pop()!.trim()}` : "Completed";
}

/**
 * Shown once an outing's last day is behind it: the trip is over, here is how
 * it landed. With a budget set it leads with the headline the user actually
 * wants — how much of the budget came back unspent.
 */
export function OutingCompleteCard({ outing, totalSpent, myReturns }: OutingCompleteCardProps) {
  const outcome = getBudgetOutcome(outing.budget, totalSpent);
  const isOver = outcome?.isOver ?? false;

  return (
    <div
      className={cn(
        "fintech-card p-5 border-2",
        isOver ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CheckCircle2 className={cn("h-4 w-4", isOver ? "text-destructive" : "text-success")} />
          Outing complete
        </p>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {endedLabel(outing)}
        </span>
      </div>

      {outcome ? (
        <div className="mt-3">
          <p
            className={cn(
              "flex items-center gap-2 text-2xl font-semibold",
              isOver ? "text-destructive" : "text-success"
            )}
          >
            {isOver ? <AlertTriangle className="h-5 w-5" /> : <PiggyBank className="h-5 w-5" />}
            {formatCurrency(isOver ? outcome.overBy : outcome.saved)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isOver ? (
              <>
                over budget —{" "}
                <span className="font-semibold text-destructive">{outcome.overPct}% more</span> than
                the {formatCurrency(outcome.budget)} planned
              </>
            ) : (
              <>
                saved —{" "}
                <span className="font-semibold text-success">{outcome.savedPct}% of your</span>{" "}
                {formatCurrency(outcome.budget)} budget went unspent
              </>
            )}
          </p>

          <div className="mt-3 space-y-1.5">
            <Progress
              value={outcome.usedPct}
              className={cn("h-2", isOver ? "[&>div]:bg-destructive" : "[&>div]:bg-success")}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Spent {formatCurrency(outcome.spent)}</span>
              <span>{Math.round(outcome.usedPct)}% of budget used</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            {formatCurrency(totalSpent)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            spent in total · set a budget next time to see what you save
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{returnsSummary(myReturns)}</p>
    </div>
  );
}
