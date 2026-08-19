import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useChartTheme } from "@/hooks/useChartTheme";
import { formatCurrency } from "@/lib/format";
import type { Outing } from "@/types";
import type { MemberSpendingDatum, PersonalSpendingAnalysis } from "@/lib/outingAnalysis";
import {
  getFirstName,
  possessiveLabel,
  formatPayTo,
  formatReturnFrom,
} from "@/lib/displayNames";
import { cn } from "@/lib/utils";

/** Name · diverging track · amount — shared by the header and every row. */
const BALANCE_ROW_GRID =
  "grid grid-cols-[minmax(3.5rem,6rem)_1fr_minmax(4.5rem,auto)] gap-2 sm:gap-3";

interface OutingAnalysisTabProps {
  outing: Outing;
  categoryData: { name: string; value: number }[];
  memberData: MemberSpendingDatum[];
  personal: PersonalSpendingAnalysis;
  totalSpent: number;
  hasBudget: boolean;
  budgetRemaining: number;
  userName: string;
}

export function OutingAnalysisTab({
  outing,
  categoryData,
  memberData,
  personal,
  totalSpent,
  hasBudget,
  budgetRemaining,
  userName,
}: OutingAnalysisTabProps) {
  const chart = useChartTheme();
  // possessiveLabel() already resolves "is this the signed-in user" via
  // setActiveUserNames(); the old check hardcoded two literal first names.
  const possessive = possessiveLabel(userName);
  const isMe = possessive === "Your";
  const displayName = isMe ? "You" : getFirstName(userName);
  const budgetUsedPct = hasBudget
    ? Math.min((totalSpent / outing.budget!) * 100, 100)
    : 0;
  const isBudgetExceeded = hasBudget && totalSpent > outing.budget!;
  const owesFriends = personal.netBalance < -0.01;
  const isOwedByFriends = personal.netBalance > 0.01;

  // Biggest debtor first, biggest creditor last — the list reads as a ranking.
  const sortedByNet = [...memberData].sort((a, b) => a.net - b.net);
  const maxNet = Math.max(...memberData.map((m) => Math.abs(m.net)), 1);

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "fintech-card p-6 border-2",
          owesFriends
            ? "border-destructive/30 bg-destructive/5"
            : isOwedByFriends
            ? "border-success/30 bg-success/5"
            : "border-border/60"
        )}
      >
        <h3 className="font-semibold text-foreground mb-1">
          {possessive} Spending Analysis
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          How {isMe ? "your" : `${displayName}'s`} payments compare to {possessive.toLowerCase()} fair share
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-5">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {displayName} Spent
            </p>
            <p className="text-xl font-semibold mt-1 tabular-nums">
              {formatCurrency(personal.spent)}
            </p>
            {personal.spent !== personal.paid && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                Paid {formatCurrency(personal.paid)}
                {personal.settledIn > 0 && ` · back ${formatCurrency(personal.settledIn)}`}
                {personal.settledOut > 0 && ` · settled ${formatCurrency(personal.settledOut)}`}
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {possessive} Share
            </p>
            <p className="text-xl font-semibold mt-1 tabular-nums">{formatCurrency(personal.share)}</p>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl border",
              owesFriends
                ? "bg-destructive/10 border-destructive/30"
                : isOwedByFriends
                ? "bg-success/10 border-success/30"
                : "bg-card border-border/50"
            )}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Net Balance
            </p>
            <p
              className={cn(
                "text-xl font-semibold mt-1 flex items-center gap-1.5",
                owesFriends && "text-destructive",
                isOwedByFriends && "text-success"
              )}
            >
              {owesFriends ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  {formatPayTo(Math.abs(personal.netBalance))}
                </>
              ) : isOwedByFriends ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  {formatReturnFrom(personal.netBalance)}
                </>
              ) : (
                "All settled"
              )}
            </p>
          </div>
        </div>

        {owesFriends && (
          <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {displayName} spent {formatCurrency(personal.spent)} but {possessive.toLowerCase()}{" "}
              share is {formatCurrency(personal.share)} —{" "}
              {formatPayTo(Math.abs(personal.netBalance))}.
            </p>
          </div>
        )}

        {isOwedByFriends && (
          <div className="flex gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success mt-3">
            <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {displayName} spent {formatCurrency(personal.spent)} vs {possessive.toLowerCase()} share{" "}
              {formatCurrency(personal.share)} — {formatReturnFrom(personal.netBalance)}.
            </p>
          </div>
        )}

        {personal.isOverBudgetShare && personal.budgetShare != null && (
          <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mt-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {possessive} share ({formatCurrency(personal.share)}) exceeds {isMe ? "your" : `${displayName}'s`}
              budget allocation of {formatCurrency(personal.budgetShare)}.
            </p>
          </div>
        )}
      </div>

      {hasBudget && (
        <div className="fintech-card p-6">
          <h3 className="font-semibold text-foreground mb-1">Budget Usage</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {formatCurrency(totalSpent)} of {formatCurrency(outing.budget!)} used
            {isBudgetExceeded
              ? ` — over by ${formatCurrency(totalSpent - outing.budget!)}`
              : ` — ${formatCurrency(budgetRemaining)} remaining`}
          </p>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isBudgetExceeded ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="fintech-card p-6">
          <h3 className="font-semibold text-foreground mb-1">Category Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-5">Where the group spent money</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={entry.name} fill={chart.colors[i % chart.colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {memberData.length > 0 && (
        <div className="fintech-card p-6">
          <h3 className="font-semibold text-foreground mb-1">Who owes what</h3>
          <p className="text-sm text-muted-foreground mb-5">
            <span className="font-medium text-destructive">Red</span> owes ·{" "}
            <span className="font-medium text-success">Green</span> gets back
          </p>

          {/* Detail: what each member put in versus what was theirs to pay. */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2">Member</th>
                  <th className="text-right font-medium pb-2">Spent</th>
                  <th className="text-right font-medium pb-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {memberData.map((m) => (
                  <tr key={m.name} className="border-t border-border/40">
                    <td className="py-2 pr-3 max-w-[10rem] truncate">{m.name}</td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatCurrency(m.spent)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(m.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Answer: one bar per member, diverging from a zero line. */}
          <div className="mt-6">
            <div className={cn(BALANCE_ROW_GRID, "mb-1.5")}>
              <span />
              <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Owes</span>
                <span>Gets back</span>
              </div>
              <span />
            </div>

            <div className="space-y-2.5">
              {sortedByNet.map((m) => {
                const settled = Math.abs(m.net) < 0.01;
                const owes = m.net < -0.01;
                // Half the track is each side, so a max-size bar reaches the edge.
                const width = `${(Math.abs(m.net) / maxNet) * 50}%`;

                return (
                  <div key={m.name} className={cn(BALANCE_ROW_GRID, "items-center")}>
                    <span className="truncate text-xs sm:text-sm">{m.name}</span>

                    <div className="relative h-6">
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
                      {settled ? (
                        <div className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rounded bg-muted-foreground/40" />
                      ) : owes ? (
                        <div
                          className="absolute inset-y-1 right-1/2 rounded-l-md bg-destructive"
                          style={{ width }}
                        />
                      ) : (
                        <div
                          className="absolute inset-y-1 left-1/2 rounded-r-md bg-success"
                          style={{ width }}
                        />
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-right text-xs font-semibold tabular-nums sm:text-sm",
                        owes && "text-destructive",
                        !owes && !settled && "text-success",
                        settled && "text-muted-foreground"
                      )}
                    >
                      {settled
                        ? "Settled"
                        : owes
                          ? `-${formatCurrency(Math.abs(m.net))}`
                          : `+${formatCurrency(m.net)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
