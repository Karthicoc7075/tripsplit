import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Map, Users, Receipt, Plus, UserPlus,
  Activity, CreditCard, Scale,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
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
import { getFirstName, possessiveLabel, formatPersonOwes, formatPersonIsOwed } from "@/lib/displayNames";
import { getMemberPaidAndShare } from "@/lib/outing";
import {
  getOutingExpenseBreakdown,
  getSpendingTrend,
  getRecentActivity,
  getTransactionsForOutings,
} from "@/lib/dashboard";
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
    friends,
    transactions,
    currentUserId,
    currentUserName,
    getOutingYourShare,
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

  const youSpent = useMemo(
    () => getMemberPaidAndShare(currentUserId, activeTransactions).paid,
    [activeTransactions, currentUserId]
  );

  const sortedOutings = useMemo(
    () =>
      [...outings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [outings]
  );

  const activeOutingId = selectedOutingId || sortedOutings[0]?.id || "";
  const selectedOuting = sortedOutings.find((o) => o.id === activeOutingId);

  const categoryData = useMemo(
    () => (activeOutingId ? getOutingExpenseBreakdown(activeOutingId, activeTransactions) : []),
    [activeOutingId, activeTransactions]
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const spendingTrend = useMemo(() => {
    const monthIdx = selectedMonth;
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const buckets = Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}`,
      amount: 0,
    }));

    activeTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
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
  }, [activeTransactions, selectedMonth, currentUserId]);

  const activityItems = useMemo(
    () => getRecentActivity(activeTransactions, outings, currentUserId, currentUserName),
    [activeTransactions, outings, currentUserId, currentUserName]
  );

  const upcomingOutings = outings.filter((o) => o.status === "planned");
  const returnAmount = dashboardStats.totalBalance;
  const isReturnPositive = returnAmount > 0;
  const isReturnNegative = returnAmount < 0;

  const firstOngoingOuting = upcomingOutings[0];

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

      {/* Stat cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title={`${possessiveLabel(currentUserName)} Active Outings`}
            value={dashboardStats.activeOutings}
            icon={Activity}
            variant="primary"
            subtitle="Currently ongoing"
          />
        </motion.div>
        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="Total Friends"
            value={friends.length}
            icon={Users}
            variant="primary"
            subtitle="In your network"
          />
        </motion.div>
        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title={`${possessiveLabel(currentUserName)} Spent`}
            value={youSpent}
            prefix="₹"
            icon={CreditCard}
            variant="default"
            subtitle={`Total amount ${possessiveLabel(currentUserName)} paid`}
          />
        </motion.div>
        <motion.div variants={fadeUp} className="h-full">
          <StatCard
            title="Return Amount"
            value={Math.abs(returnAmount)}
            prefix={isReturnNegative ? "-₹" : "₹"}
            icon={Scale}
            variant={
              isReturnNegative
                ? "destructive"
                : isReturnPositive
                  ? "success"
                  : "default"
            }
            subtitle={
              isReturnNegative
                ? formatPersonOwes(currentUserName, Math.abs(returnAmount))
                : isReturnPositive
                  ? formatPersonIsOwed(currentUserName, returnAmount)
                  : "All settled"
            }
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
                  {possessiveLabel(currentUserName)} share in {MONTH_NAMES[selectedMonth]}
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
                    tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
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
          {/* Quick actions — stacked on desktop, horizontal scroll on mobile */}
          <div className="fintech-card p-4 sm:p-5">
            <h3 className="font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto lg:max-w-none lg:mx-0">
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
                icon={Receipt}
                label="Log Expense"
                description="Record a new transaction"
                onClick={() =>
                  navigate(firstOngoingOuting ? `/outings/${firstOngoingOuting.id}` : "/outings")
                }
              />
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
          <ActivityFeed items={activityItems} />
        )}
      </motion.div>
    </div>
  );
}