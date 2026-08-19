import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Map, Receipt, Plus, UserPlus, Wallet,
  CreditCard, Scale, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatCompact, getCurrencySymbol } from "@/lib/format";
import { getCategoryColor } from "@/types";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/fintech/StatCard";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { UpcomingOutingChip } from "@/components/dashboard/UpcomingOutingChip";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmptyState } from "@/components/EmptyState";
import { DashboardStatsSkeleton } from "@/components/skeletons";
import { useChartTheme } from "@/hooks/useChartTheme";
import { getTimeGreeting } from "@/lib/greeting";
import {
  getFirstName,
  possessiveLabel,
  formatPayTo,
  formatReturnFrom,
} from "@/lib/displayNames";
import {
  getOutingExpenseBreakdown,
  getTransactionDate,
  getRecentActivity,
  getTransactionsForOutings,
  getThisMonthSpent,
  getMonthOverMonthTrend,
} from "@/lib/dashboard";
import { getDashboardContext } from "@/lib/dashboardContext";
import { isOpenOuting } from "@/lib/balances";
import { getOutingDate } from "@/lib/reportFilters";
import { OutingContextStrip } from "@/components/dashboard/OutingContextStrip";
import { FirstRunPanel } from "@/components/dashboard/FirstRunPanel";
import { DataErrorState } from "@/components/DataErrorState";
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function Dashboard() {
  const { user } = useAuth();
  const {
    loading,
    dashboardStats,
    outings,
    transactions,
    currentUserId,
    currentUserName,
    getOutingYourShare,
    updateOuting,
    settlementRecords,
    friends,
    error,
    retry,
  } = useData();
  const navigate = useNavigate();
  const chart = useChartTheme();
  const [selectedOutingId, setSelectedOutingId] = useState<string>("");

  const firstName = getFirstName(user?.displayName ?? currentUserName);
  const greeting = getTimeGreeting();

  const activeTransactions = useMemo(
    () => getTransactionsForOutings(transactions, outings),
    [transactions, outings]
  );

  const dashboardContext = useMemo(
    () => getDashboardContext(outings, activeTransactions),
    [outings, activeTransactions]
  );

  const contextOuting = dashboardContext.mode === "home" ? null : dashboardContext.outing;

  const thisMonthSpent = useMemo(
    () => getThisMonthSpent(activeTransactions, currentUserId),
    [activeTransactions, currentUserId]
  );

  const monthTrend = useMemo(
    () => getMonthOverMonthTrend(activeTransactions, currentUserId),
    [activeTransactions, currentUserId]
  );

  const sortedOutings = useMemo(
    () =>
      [...outings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [outings]
  );

  // Defaults to the outing the context strip is already leading with, so the
  // header and the chart never talk about different trips.
  const activeOutingId =
    selectedOutingId || contextOuting?.id || sortedOutings[0]?.id || "";
  const selectedOuting = sortedOutings.find((o) => o.id === activeOutingId);

  const categoryData = useMemo(
    () => (activeOutingId ? getOutingExpenseBreakdown(activeOutingId, activeTransactions) : []),
    [activeOutingId, activeTransactions]
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  /**
   * The dropdown only offers month names, so resolve the year as the most
   * recent occurrence of that month: a month later than the current one must
   * belong to last year. Without this, picking December always meant December
   * of this year — a month that has not happened yet, so the chart was empty.
   */
  const selectedYear = useMemo(() => {
    const now = new Date();
    return selectedMonth > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
  }, [selectedMonth]);

  const spendingTrend = useMemo(() => {
    const monthIdx = selectedMonth;
    const year = selectedYear;
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const buckets = Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}`,
      amount: 0,
    }));

    activeTransactions.forEach((tx) => {
      // Bucket by the expense date the user entered, not when it was logged.
      const txDate = getTransactionDate(tx);
      if (txDate.getMonth() === monthIdx && txDate.getFullYear() === year) {
        const dayNum = txDate.getDate();
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          const split = tx.splits.find((s) => s.memberId === currentUserId);
          buckets[dayNum - 1].amount += split?.amount ?? 0;
        }
      }
    });

    return buckets.map((b) => ({
      month: `${b.day} ${MONTH_LABELS_SHORT[monthIdx]}`,
      amount: Math.round(b.amount * 100) / 100,
    }));
  }, [activeTransactions, selectedMonth, selectedYear, currentUserId]);

  /**
   * Activity is about what is live: ongoing and planned outings. When nothing
   * is open, fall back to the most recent outing so the feed still has
   * something to show rather than going blank.
   */
  const activityOutings = useMemo(() => {
    const open = outings.filter(isOpenOuting);
    if (open.length > 0) return open;

    const last = [...outings].sort(
      (a, b) => getOutingDate(b).getTime() - getOutingDate(a).getTime()
    )[0];
    return last ? [last] : [];
  }, [outings]);

  const activityItems = useMemo(
    () =>
      getRecentActivity(
        activeTransactions,
        activityOutings,
        currentUserId,
        currentUserName,
        // Everything from the live outings; the list scrolls rather than truncating.
        200,
        settlementRecords
      ),
    [activeTransactions, activityOutings, currentUserId, currentUserName, settlementRecords]
  );

  const upcomingOutings = outings.filter((o) => o.status === "planned");

  // A fresh account has nothing to summarise — show the path in, not five
  // empty boxes stacked on top of each other.
  const isFirstRun = activeTransactions.length === 0;

  const handleReopenOuting = useCallback(
    (outingId: string) => {
      updateOuting(outingId, { status: "ongoing" });
      toast.success("Outing reopened", {
        description: "It counts towards your balances again.",
      });
    },
    [updateOuting]
  );
  // Net position across every open outing. Two-directional, so it carries the
  // neutral name: "Return Amount" only reads correctly when money is coming back.
  const netBalance = dashboardStats.totalBalance;
  const isNetPositive = netBalance > 0;
  const isNetNegative = netBalance < 0;


  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <DataErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted/50 animate-pulse rounded-lg" />
          <div className="h-4 w-80 bg-muted/30 animate-pulse rounded-md" />
        </div>
        <DashboardStatsSkeleton />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <div className="fintech-card h-72 animate-pulse bg-muted/20" />
            <div className="fintech-card h-72 animate-pulse bg-muted/20" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="fintech-card h-20 animate-pulse bg-muted/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 min-w-0">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with {possessiveLabel(currentUserName).toLowerCase()} outings today
        </p>
      </motion.div>

      {/* What is happening right now — quiet at home, loud mid-trip. */}
      {isFirstRun ? (
        <FirstRunPanel
          hasFriends={friends.length > 0}
          hasOutings={outings.length > 0}
          hasExpenses={activeTransactions.length > 0}
          name={firstName}
        />
      ) : (
        <OutingContextStrip context={dashboardContext} onReopen={handleReopenOuting} />
      )}

      {/* Stat cards — the two halves of your balance are the actionable ones. */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="Net Balance"
            value={Math.abs(netBalance)}
            prefix={`${isNetNegative ? "-" : ""}${getCurrencySymbol()}`}
            icon={Scale}
            variant={
              isNetNegative ? "destructive" : isNetPositive ? "success" : "default"
            }
            subtitle={
              isNetNegative
                ? formatPayTo(Math.abs(netBalance))
                : isNetPositive
                  ? formatReturnFrom(netBalance)
                  : "All settled"
            }
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="To Collect"
            value={dashboardStats.youAreOwed}
            prefix={getCurrencySymbol()}
            icon={ArrowDownLeft}
            variant={dashboardStats.youAreOwed > 0 ? "success" : "default"}
            subtitle={
              dashboardStats.owedCount > 0
                ? `From ${dashboardStats.owedCount} ${dashboardStats.owedCount === 1 ? "person" : "people"}`
                : "Nobody owes you"
            }
            onClick={() => navigate("/settle")}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="To Pay"
            value={dashboardStats.youOwe}
            prefix={getCurrencySymbol()}
            icon={ArrowUpRight}
            variant={dashboardStats.youOwe > 0 ? "destructive" : "default"}
            subtitle={
              dashboardStats.oweCount > 0
                ? `To ${dashboardStats.oweCount} ${dashboardStats.oweCount === 1 ? "person" : "people"}`
                : "You owe nothing"
            }
            onClick={() => navigate("/settle")}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="This Month"
            value={thisMonthSpent}
            prefix={getCurrencySymbol()}
            icon={CreditCard}
            variant="primary"
            trend={monthTrend}
            subtitle={`${possessiveLabel(currentUserName)} share of expenses`}
          />
        </motion.div>
      </motion.div>

      {/* Main two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — Insights */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3 space-y-6"
        >
          <div className="fintech-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">Category Breakdown</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Spending by category for selected outing
                  </p>
                </div>
                {outings.length > 0 && (
                  <div className="w-full sm:w-64 shrink-0 space-y-1.5">
                    <Label htmlFor="outing-select" className="text-xs text-muted-foreground">
                      Select outing
                    </Label>
                    <select
                      id="outing-select"
                      value={activeOutingId}
                      onChange={(e) => setSelectedOutingId(e.target.value)}
                      className={cn(
                        "flex h-11 w-full rounded-lg border border-border bg-surface-input px-4 py-2 text-sm transition-all duration-200",
                        "text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                      )}
                    >
                      {sortedOutings.map((outing) => (
                        <option key={outing.id} value={outing.id}>
                          {outing.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {outings.length === 0 ? (
                <EmptyState
                  icon={Map}
                  title="No active outings"
                  description="Create an outing to start tracking shared expenses."
                  actionLabel="Create Outing"
                  onAction={() => navigate("/outings")}
                />
              ) : categoryData.length > 0 ? (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="h-52 w-full sm:h-56 sm:w-56 shrink-0 mx-auto sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={getCategoryColor(entry.name) || chart.colors[index % chart.colors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: chart.tooltip.bg,
                            border: `1px solid ${chart.tooltip.border}`,
                            borderRadius: 8,
                            fontSize: 13,
                          }}
                          formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <ul className="w-full sm:flex-1 sm:max-w-[220px] space-y-3">
                    {categoryData.map((item, index) => (
                      <li
                        key={item.name}
                        className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              getCategoryColor(item.name) || chart.colors[index % chart.colors.length],
                          }}
                        />
                        <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex min-h-[208px] sm:min-h-[224px] flex-col items-center justify-center text-center px-4">
                  <Receipt className="h-8 w-8 text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    No expenses in {selectedOuting?.name ?? "this outing"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Log expenses to see the category breakdown.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Spending trend */}
          <div className="fintech-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <h3 className="font-semibold text-foreground">Spending Trend</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {possessiveLabel(currentUserName)} share in {MONTH_NAMES[selectedMonth]} {selectedYear}
                </p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm shrink-0"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-48 sm:h-56 -mx-1 sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrend}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={(v) => formatCompact(Number(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chart.tooltip.bg,
                      border: `1px solid ${chart.tooltip.border}`,
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spent"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={chart.primary}
                    strokeWidth={2}
                    fill="url(#spendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Right — Quick actions + Upcoming outings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Desktop only: on mobile the header FAB (md:hidden) already offers
              these same actions, so the card was a duplicate costing a screenful
              of scroll above the outings and activity people actually come for. */}
          <div className="hidden md:block fintech-card p-4 sm:p-5">
            <h3 className="font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto lg:max-w-none lg:mx-0">
              {dashboardContext.mode === "active" && contextOuting ? (
                <>
                  <QuickActionButton
                    icon={Receipt}
                    label="Add Transaction"
                    description={`Add to ${contextOuting.name}`}
                    variant="primary"
                    onClick={() => navigate(`/outings/${contextOuting.id}?add=1`)}
                  />
                  <QuickActionButton
                    icon={Scale}
                    label="Settle Up"
                    description="Clear who owes what"
                    onClick={() => navigate("/settle")}
                  />
                  <QuickActionButton
                    icon={Plus}
                    label="Create New Outing"
                    description="Start tracking a new trip"
                    onClick={() => navigate("/outings")}
                  />
                </>
              ) : dashboardContext.mode === "planning" && contextOuting ? (
                <>
                  <QuickActionButton
                    icon={UserPlus}
                    label="Add Members"
                    description={`Invite friends to ${contextOuting.name}`}
                    variant="primary"
                    onClick={() => navigate(`/outings/${contextOuting.id}`)}
                  />
                  <QuickActionButton
                    icon={Wallet}
                    label="Set Budget"
                    description="Plan what the trip should cost"
                    onClick={() => navigate(`/outings/${contextOuting.id}`)}
                  />
                  <QuickActionButton
                    icon={Receipt}
                    label="Add Transaction"
                    description="Tickets, deposits, advance payments"
                    onClick={() => navigate(`/outings/${contextOuting.id}?add=1`)}
                  />
                </>
              ) : (
                <>
                  <QuickActionButton
                    icon={Plus}
                    label="Create New Outing"
                    description="Start tracking a new trip"
                    variant="primary"
                    onClick={() => navigate("/outings")}
                  />
                  <QuickActionButton
                    icon={UserPlus}
                    label="Add Friend"
                    description="Invite someone to split"
                    onClick={() => navigate("/friends")}
                  />
                  <QuickActionButton
                    icon={Scale}
                    label="Settle Up"
                    description="Clear who owes what"
                    onClick={() => navigate("/settle")}
                  />
                </>
              )}
            </div>
          </div>

          {/* Upcoming outings */}
          <div className="fintech-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <h3 className="font-semibold text-foreground">Upcoming Outings</h3>
              <Link to="/outings" className="text-xs sm:text-sm text-primary font-medium hover:underline shrink-0">
                View all
              </Link>
            </div>
            {upcomingOutings.length === 0 ? (
              <EmptyState
                icon={Map}
                title="No planned outings"
                description="Create an outing to start tracking shared expenses."
                actionLabel="Create Outing"
                onAction={() => navigate("/outings")}
              />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                {upcomingOutings.map((outing) => (
                  <UpcomingOutingChip
                    key={outing.id}
                    outing={outing}
                    yourShare={getOutingYourShare(outing.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent activity — full width */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {activityItems.length === 0 ? (
          <div className="fintech-card">
            <EmptyState
              icon={Receipt}
              title="No recent activity"
              description="Your transactions and outing updates will appear here."
              actionLabel="Log Expense"
              onAction={() => navigate("/outings")}
            />
          </div>
        ) : (
          <ActivityFeed
            items={activityItems}
            title={
              activityOutings.length === 1 && !isOpenOuting(activityOutings[0])
                ? `Recent Activity · ${activityOutings[0].name}`
                : "Recent Activity"
            }
            itemsClassName="max-h-[26rem] overflow-y-auto pr-1"
          />
        )}
      </motion.div>
    </div>
  );
}