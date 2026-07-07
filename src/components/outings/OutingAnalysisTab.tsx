import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useChartTheme } from "@/hooks/useChartTheme";
import { formatCurrency } from "@/lib/format";
import type { Outing } from "@/types";
import type { PersonalSpendingAnalysis } from "@/lib/outingAnalysis";
import {
  getFirstName,
  possessiveLabel,
  formatPersonOwes,
  formatPersonIsOwed,
  memberLabel,
} from "@/lib/displayNames";
import { cn } from "@/lib/utils";

interface OutingAnalysisTabProps {
  outing: Outing;
  categoryData: { name: string; value: number }[];
  memberData: { name: string; paid: number; share: number }[];
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
  const isMe = userName.toLowerCase() === "shankar" || userName.toLowerCase() === "karthi" || userName.toLowerCase().includes("(you)") || userName.toLowerCase() === "you";
  const displayName = isMe ? "You" : getFirstName(userName);
  const possessive = isMe ? "Your" : possessiveLabel(userName);
  const budgetUsedPct = hasBudget
    ? Math.min((totalSpent / outing.budget!) * 100, 100)
    : 0;
  const isBudgetExceeded = hasBudget && totalSpent > outing.budget!;
  const owesFriends = personal.netBalance < -0.01;
  const isOwedByFriends = personal.netBalance > 0.01;

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
              {displayName} Paid
            </p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(personal.paid)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {possessive} Share
            </p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(personal.share)}</p>
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
              {possessive} Balance
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
                  {formatPersonOwes(userName, Math.abs(personal.netBalance))}
                </>
              ) : isOwedByFriends ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  {formatPersonIsOwed(userName, personal.netBalance)}
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
              {displayName} paid {formatCurrency(personal.paid)} but {possessive.toLowerCase()} share
              is {formatCurrency(personal.share)} —{" "}
              {formatPersonOwes(userName, Math.abs(personal.netBalance))}.
            </p>
          </div>
        )}

        {isOwedByFriends && (
          <div className="flex gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success mt-3">
            <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {displayName} paid {formatCurrency(personal.paid)} vs {possessive.toLowerCase()} share{" "}
              {formatCurrency(personal.share)} — {formatPersonIsOwed(userName, personal.netBalance)}.
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
          <h3 className="font-semibold text-foreground mb-1">Member Comparison</h3>
          <p className="text-sm text-muted-foreground mb-5">Paid vs share by member</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="paid" name="Paid" fill={chart.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="share" name="Share" fill={chart.text} radius={[4, 4, 0, 0]} />
                <Bar dataKey="return" name="Return" fill={chart.isDark ? "#34D399" : "#10B981"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name="Remaining" fill={chart.isDark ? "#F87171" : "#EF4444"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}