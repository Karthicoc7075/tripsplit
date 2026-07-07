import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Loader2,
  Receipt,
  Map,
  Users,
  Wallet,
  TrendingUp,
  PieChart as PieChartIcon,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/fintech/StatCard";
import { FilterChips } from "@/components/fintech/FilterChips";
import { EmptyState } from "@/components/EmptyState";
import { useChartTheme } from "@/hooks/useChartTheme";
import { formatCurrency, formatCompact } from "@/lib/format";
import { getFirstName, possessiveLabel } from "@/lib/displayNames";
import { getBalanceLabel } from "@/lib/friends";
import { getCategoryColor } from "@/types";
import { cn } from "@/lib/utils";
import {
  type ReportPeriod,
  getReportSummary,
  getOutingRankings,
  getCategoryBreakdownForPeriod,
  getSpendingTrendForPeriod,
  buildReportCsv,
  downloadCsv,
  filterTransactionsByPeriod,
} from "@/lib/reports";
import { computeFriendBalances } from "@/lib/balances";
import { getRecentActivity } from "@/lib/dashboard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";


import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

export default function Reports() {
  const {
    outings,
    transactions,
    friends,
    currentUserId,
    currentUserName,
    loading,
    settlementRecords,
  } = useData();
  const firstName = getFirstName(currentUserName);
  const navigate = useNavigate();
  const chart = useChartTheme();
  const [period, setPeriod] = useState<ReportPeriod>("6m");
  const [exporting, setExporting] = useState(false);

  const filteredOutings = useMemo(
    () =>
      outings.filter((o) => {
        const nameLower = o.name.toLowerCase();
        const descLower = (o.description ?? "").toLowerCase();
        const catLower = o.category.toLowerCase();
        const isBackup =
          nameLower.includes("backup") ||
          descLower.includes("backup") ||
          catLower.includes("backup");
        return !isBackup;
      }),
    [outings]
  );

  const filteredOutingIds = useMemo(
    () => new Set(filteredOutings.map((o) => o.id)),
    [filteredOutings]
  );

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => filteredOutingIds.has(t.outingId)),
    [transactions, filteredOutingIds]
  );

  const filteredSettlementRecords = useMemo(
    () => settlementRecords.filter((r) => filteredOutingIds.has(r.outingId)),
    [settlementRecords, filteredOutingIds]
  );

  const friendBalances = useMemo(
    () =>
      computeFriendBalances(
        friends,
        filteredOutings,
        filteredTransactions,
        currentUserId,
        currentUserName,
        filteredSettlementRecords
      ),
    [friends, filteredOutings, filteredTransactions, currentUserId, currentUserName, filteredSettlementRecords]
  );

  const summary = useMemo(
    () => getReportSummary(filteredTransactions, filteredOutings, currentUserId, period),
    [filteredTransactions, filteredOutings, currentUserId, period]
  );

  const outingRankings = useMemo(
    () => getOutingRankings(filteredOutings, filteredTransactions, currentUserId, period),
    [filteredOutings, filteredTransactions, currentUserId, period]
  );

  const categoryData = useMemo(
    () => getCategoryBreakdownForPeriod(filteredTransactions, period),
    [filteredTransactions, period]
  );

  const spendingTrend = useMemo(
    () => getSpendingTrendForPeriod(filteredTransactions, currentUserId, period),
    [filteredTransactions, currentUserId, period]
  );

  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(filteredTransactions, period),
    [filteredTransactions, period]
  );

  const activityItems = useMemo(
    () => getRecentActivity(periodTransactions, filteredOutings, currentUserId, currentUserName, 1000),
    [periodTransactions, filteredOutings, currentUserId, currentUserName]
  );



  const categoryTotal = categoryData.reduce((s, c) => s + c.value, 0);

  const sortedFriends = useMemo(
    () =>
      [...friends].sort(
        (a, b) =>
          Math.abs(friendBalances.get(b.id) ?? 0) - Math.abs(friendBalances.get(a.id) ?? 0)
      ),
    [friends, friendBalances]
  );

  const hasData = summary.transactionCount > 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = buildReportCsv({
        period,
        summary,
        outingRankings,
        categoryData,
        friends,
        friendBalances,
      });
      downloadCsv(`tripsplit-report-${period}-${Date.now()}.csv`, csv);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="h-10 w-48 bg-muted/40 animate-pulse rounded-lg" />
        <div className="h-4 w-72 bg-muted/30 animate-pulse rounded-md" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="fintech-card h-28 animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="fintech-card h-72 animate-pulse bg-muted/20" />
          <div className="fintech-card h-72 animate-pulse bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 min-w-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spending insights, outing breakdowns, and friend balances.
          </p>
        </div>
        <Button
          className="gap-2 h-11 px-5 shadow-md shadow-primary/20 w-full sm:w-auto shrink-0"
          onClick={handleExport}
          disabled={exporting || !hasData}
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Export CSV
        </Button>
      </motion.div>

      {/* Period filter */}
      <FilterChips options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      {!hasData ? (
        <EmptyState
          icon={Receipt}
          title="No report data yet"
          description="Add outings and log expenses to unlock spending insights and exports."
          actionLabel="Go to Outings"
          onAction={() => navigate("/outings")}
          secondaryActionLabel="Go to Dashboard"
          onSecondaryAction={() => navigate("/dashboard")}
        />
      ) : (
        <>
          {/* KPI row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={fadeUp}>
              <StatCard
                title="Total Expenses"
                value={summary.totalExpenses}
                prefix="₹"
                icon={Receipt}
                variant="primary"
                subtitle={`${summary.transactionCount} transactions`}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard
                title={`${possessiveLabel(currentUserName)} Paid`}
                value={summary.youPaid}
                prefix="₹"
                icon={Wallet}
                variant="default"
                subtitle={`Amount you paid`}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard
                title={`${possessiveLabel(currentUserName)} Share`}
                value={summary.yourShare}
                prefix="₹"
                icon={TrendingUp}
                variant="default"
                subtitle={`${firstName}'s portion of costs`}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard
                title="Outings"
                value={summary.activeOutings}
                icon={Map}
                variant="primary"
                subtitle="With expenses in period"
              />
            </motion.div>
          </motion.div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-3 fintech-card overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-border/50">
                <h3 className="font-semibold text-foreground">Spending Trend</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {possessiveLabel(currentUserName)} share over time
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <div className="h-48 sm:h-64 -mx-1 sm:mx-0">
                  {spendingTrend.some((d) => d.amount > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spendingTrend}>
                        <defs>
                          <linearGradient id="reportSpendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chart.primary} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={chart.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="month"
                          tick={{ fill: chart.text, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: chart.text, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => formatCompact(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: chart.tooltip.bg,
                            border: `1px solid ${chart.tooltip.border}`,
                            borderRadius: 8,
                            fontSize: 13,
                          }}
                          formatter={(v) => [
                            formatCurrency(Number(v)),
                            `${possessiveLabel(currentUserName)} share`,
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke={chart.primary}
                          strokeWidth={2}
                          fill="url(#reportSpendGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No spending in this period
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2 fintech-card overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-border/50">
                <h3 className="font-semibold text-foreground">By Category</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Expense type split</p>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                {categoryData.length > 0 ? (
                  categoryData.map((item, index) => {
                    const pct = categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0;
                    const color =
                      getCategoryColor(item.name) || chart.colors[index % chart.colors.length];
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground truncate">{item.name}</span>
                          <span className="font-semibold text-foreground tabular-nums shrink-0">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                    No categories yet
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Outing rankings */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="fintech-card overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-border/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Outing Rankings</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Highest spending outings in this period
                </p>
              </div>
              <PieChartIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>

            {outingRankings.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No outing expenses in this period
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {outingRankings.map((outing, index) => (
                  <Link
                    key={outing.id}
                    to={`/outings/${outing.id}`}
                    className="flex items-center gap-4 p-4 sm:p-5 hover:bg-muted/30 transition-colors group"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {outing.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {outing.category} · {outing.transactionCount}{" "}
                            {outing.transactionCount === 1 ? "expense" : "expenses"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(outing.spent)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {possessiveLabel(currentUserName)} share {formatCurrency(outing.share)}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${outing.percent}%` }}
                        />
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Friend balances */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="fintech-card overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-border/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Friend Balances</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Who owes whom across all outings
                </p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>

            {sortedFriends.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="No friends yet"
                  description="Add friends to see balance breakdowns here."
                  actionLabel="Add Friends"
                  onAction={() => navigate("/friends")}
                />
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2">
                {sortedFriends.map((friend) => {
                  const balance = friendBalances.get(friend.id) ?? 0;
                  const isSettled = Math.abs(balance) < 0.01;
                  const theyOweYou = balance > 0;

                  return (
                    <Link
                      key={friend.id}
                      to={`/friends/details/${friend.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/50 p-4 hover:border-border hover:bg-muted/20 transition-all group"
                    >
                      <Avatar className="h-10 w-10 border border-border/60 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {friend.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {friend.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            "inline-block text-sm font-semibold px-2.5 py-1 rounded-lg tabular-nums",
                            isSettled && "bg-muted text-muted-foreground",
                            theyOweYou && !isSettled && "bg-success/15 text-success",
                            !theyOweYou && !isSettled && "bg-destructive/15 text-destructive"
                          )}
                        >
                          {isSettled ? "Settled" : formatCurrency(balance, true)}
                        </span>
                        {!isSettled && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {getBalanceLabel(balance, friend.name)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* All Activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActivityFeed
              items={activityItems}
              title="All Activity"
              showViewAll={false}
              itemsClassName="max-h-[500px] overflow-y-auto pr-1"
            />
          </motion.div>
        </>
      )}
    </div>
  );
}