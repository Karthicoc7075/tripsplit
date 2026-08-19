import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Download, Loader2, Receipt, Map, Users, Wallet, TrendingUp, Search,
  Printer, FileJson, X, Sparkles, ArrowUpRight, PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/fintech/StatCard";
import { FilterChips } from "@/components/fintech/FilterChips";
import { EmptyState } from "@/components/EmptyState";
import { OutingMemoryCard } from "@/components/reports/OutingMemoryCard";
import { ActiveFilterBar } from "@/components/reports/ActiveFilterBar";
import { DataErrorState } from "@/components/DataErrorState";
import {
  PremiumTabs, PremiumTabsList, PremiumTabsTrigger, PremiumTabsContent,
} from "@/components/fintech/PremiumTabs";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useReportData } from "@/hooks/useReportData";
import { formatCurrency, formatCompact, getCurrencySymbol } from "@/lib/format";
import { getFirstName, possessiveLabel } from "@/lib/displayNames";
import { getBalanceLabel } from "@/lib/friends";
import { getCategoryColor } from "@/types";
import { cn } from "@/lib/utils";
import {
  buildReportCsv, buildReportJson, downloadCsv, downloadFile,
} from "@/lib/reports";
import {
  DEFAULT_FILTERS, parseReportFilters,
  serializeReportFilters, type ReportFilters, type ReportTab,
} from "@/lib/reportFilters";

const PERIOD_OPTIONS: { value: ReportFilters["period"]; label: string }[] = [
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
];

const TABS: { value: ReportTab; label: string }[] = [
  { value: "memories", label: "Memories" },
  { value: "insights", label: "Insights" },
  { value: "friends", label: "Friends" },
];

/** Grows on demand instead of rendering years of outings at once. */
const PAGE_SIZE = 12;

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

export default function Reports() {
  const navigate = useNavigate();
  const chart = useChartTheme();
  const { updateOuting, error, retry } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // All page state lives in the URL, so every view is shareable and survives a
  // refresh — and a new filter is a new key here, not a restructure.
  const filters = useMemo(() => parseReportFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ReportFilters>) => {
      setSearchParams(serializeReportFilters({ ...filters, ...patch }), { replace: true });
      if (patch.tab === undefined) setVisibleCount(PAGE_SIZE);
    },
    [filters, setSearchParams]
  );

  const clearFilters = useCallback(
    () => setFilters({ ...DEFAULT_FILTERS, tab: filters.tab, period: filters.period }),
    [setFilters, filters.tab, filters.period]
  );

  const data = useReportData(filters);
  const {
    loading, currentUserName, friends, hasAnyOutings, availableYears,
    availableCategories, availableMembers, filteredOutings, filteredTransactions,
    sections, memories, yearReview, summary, categoryData, spendingTrend,
    outingRankings, friendBalances, sortedFriends,
  } = data;

  const firstName = getFirstName(currentUserName);
  const categoryTotal = categoryData.reduce((s, c) => s + c.value, 0);
  const hasPeriodData = summary.transactionCount > 0;

  const handleTogglePin = useCallback(
    (outingId: string, pinned: boolean) => {
      updateOuting(outingId, { pinned });
      toast.success(pinned ? "Pinned to the top" : "Unpinned");
    },
    [updateOuting]
  );

  const exportPayload = useMemo(
    () => ({
      period: filters.period,
      summary,
      outingRankings,
      categoryData,
      friends,
      friendBalances,
    }),
    [filters.period, summary, outingRankings, categoryData, friends, friendBalances]
  );

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadCsv(`tripsplit-report-${stamp}.csv`, buildReportCsv(exportPayload));
      } else {
        downloadFile(
          `tripsplit-report-${stamp}.json`,
          buildReportJson({
            ...exportPayload,
            outings: filteredOutings,
            transactions: filteredTransactions,
          }),
          "application/json"
        );
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/30" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="fintech-card h-36 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <PageTitle />
        <DataErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  if (!hasAnyOutings) {
    return (
      <div className="space-y-6 pb-6">
        <PageTitle />
        <EmptyState
          icon={Receipt}
          title="No report data yet"
          description="Add outings and log expenses to unlock spending insights and exports."
          actionLabel="Go to Outings"
          onAction={() => navigate("/outings")}
        />
      </div>
    );
  }

  // Sections are already newest-first with pinned on top, so slicing the flat
  // list takes the most recent N and every section stays in order.
  const flatOutings = sections.flatMap((s) => s.outings);
  const shownIds = new Set(flatOutings.slice(0, visibleCount).map((o) => o.id));
  const remaining = flatOutings.length - shownIds.size;

  return (
    <div className="min-w-0 space-y-6 pb-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <PageTitle />
        <div className="flex flex-wrap gap-2" data-print-hide>
          <Button variant="outline" className="h-11 gap-2" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2"
            onClick={() => handleExport("json")}
            disabled={exporting !== null}
          >
            {exporting === "json" ? <Loader2 size={16} className="animate-spin" /> : <FileJson size={16} />}
            JSON
          </Button>
          <Button
            className="h-11 gap-2 shadow-md shadow-primary/20"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
          >
            {exporting === "csv" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            CSV
          </Button>
        </div>
      </motion.div>

      <PremiumTabs
        value={filters.tab}
        onValueChange={(v) => setFilters({ tab: v as ReportTab })}
      >
        <PremiumTabsList data-print-hide>
          {TABS.map((t) => (
            <PremiumTabsTrigger key={t.value} value={t.value} className="flex-1">
              {t.label}
            </PremiumTabsTrigger>
          ))}
        </PremiumTabsList>

        <ActiveFilterBar
          filters={filters}
          memberName={availableMembers.find((m) => m.id === filters.memberId)?.name}
          onChange={setFilters}
          onClear={clearFilters}
          className="mt-4"
        />

        {/* ── Memories ─────────────────────────────────────────────────── */}
        <PremiumTabsContent value="memories" className="space-y-5">
          <div className="space-y-3" data-print-hide>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value })}
                placeholder="Search outings, places, people, expenses…"
                className="h-11 pl-9 pr-9"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => setFilters({ query: "" })}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <FilterChips
              options={[
                { value: "all", label: "All years" },
                ...availableYears.map((y) => ({ value: y, label: y })),
              ]}
              value={filters.year}
              onChange={(year) => setFilters({ year })}
            />

            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                label="Outing type"
                value={filters.category}
                onChange={(category) => setFilters({ category })}
                options={[
                  { value: "all", label: "All outing types" },
                  ...availableCategories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <FilterSelect
                label="Member"
                value={filters.memberId}
                onChange={(memberId) => setFilters({ memberId })}
                options={[
                  { value: "all", label: "Everyone" },
                  ...availableMembers.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </div>
          </div>

          {yearReview && <YearReviewCard review={yearReview} name={firstName} />}

          {flatOutings.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matches those filters"
              description="Try a different year, category, or search term."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
              {sections.map((section) => {
                const visible = section.outings.filter((o) => shownIds.has(o.id));
                if (visible.length === 0) return null;
                return (
                  <div key={section.key} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </h2>
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {visible.length}
                      </span>
                    </div>
                    {visible.map((outing) => {
                      const memory = memories.get(outing.id);
                      if (!memory) return null;
                      return (
                        <motion.div key={outing.id} variants={fadeUp}>
                          <OutingMemoryCard memory={memory} onTogglePin={handleTogglePin} />
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}

              {remaining > 0 && (
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  data-print-hide
                >
                  Show {Math.min(remaining, PAGE_SIZE)} earlier {remaining === 1 ? "outing" : "outings"}
                  <span className="ml-1 text-muted-foreground">({remaining} left)</span>
                </Button>
              )}
            </motion.div>
          )}
        </PremiumTabsContent>

        {/* ── Insights ─────────────────────────────────────────────────── */}
        <PremiumTabsContent value="insights" className="space-y-6">
          <div data-print-hide>
            <FilterChips
              options={PERIOD_OPTIONS}
              value={filters.period}
              onChange={(period) => setFilters({ period })}
            />
          </div>

          {!hasPeriodData ? (
            <EmptyState
              icon={Receipt}
              title="No expenses in this period"
              description="Pick a longer period or log some expenses to see insights."
              actionLabel="Show all time"
              onAction={() => setFilters({ period: "all" })}
            />
          ) : (
            <>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
              >
                <motion.div variants={fadeUp}>
                  <StatCard title="Total Expenses" value={summary.totalExpenses} prefix={getCurrencySymbol()} icon={Wallet} variant="primary" subtitle={`${summary.transactionCount} transactions`} />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <StatCard title={`${possessiveLabel(currentUserName)} Paid`} value={summary.youPaid} prefix={getCurrencySymbol()} icon={TrendingUp} variant="default" subtitle="Amount you paid" />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <StatCard title={`${possessiveLabel(currentUserName)} Share`} value={summary.yourShare} prefix={getCurrencySymbol()} icon={PieChartIcon} variant="default" subtitle={`${firstName}'s portion of costs`} />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <StatCard title="Outings" value={summary.activeOutings} icon={Map} variant="default" subtitle="With expenses in period" />
                </motion.div>
              </motion.div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="fintech-card p-4 sm:p-6">
                  <h3 className="font-semibold text-foreground">Spending Trend</h3>
                  <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
                    {possessiveLabel(currentUserName)} share over time
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spendingTrend}>
                        <defs>
                          <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chart.primary} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={chart.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chart.text, fontSize: 12 }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => formatCompact(Number(v))} />
                        <Tooltip
                          contentStyle={{ background: chart.tooltip.bg, border: `1px solid ${chart.tooltip.border}`, borderRadius: 8, fontSize: 13 }}
                          formatter={(v) => [formatCurrency(Number(v)), "Your share"]}
                        />
                        <Area type="monotone" dataKey="amount" stroke={chart.primary} strokeWidth={2} fill="url(#reportGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="fintech-card p-4 sm:p-6">
                  <h3 className="font-semibold text-foreground">By Expense Category</h3>
                  <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
                    Food, transport, stays — where the group spent
                  </p>
                  {categoryData.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">No categories yet</p>
                  ) : (
                    <ul className="space-y-3">
                      {categoryData.slice(0, 8).map((c) => {
                        const pct = categoryTotal > 0 ? Math.round((c.value / categoryTotal) * 100) : 0;
                        return (
                          <li key={c.name} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-foreground">{c.name}</span>
                              <span className="shrink-0 font-semibold tabular-nums">
                                {formatCurrency(c.value)}
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{pct}%</span>
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: getCategoryColor(c.name) }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="fintech-card p-4 sm:p-6">
                <h3 className="font-semibold text-foreground">Outing Rankings</h3>
                <p className="mb-4 mt-0.5 text-sm text-muted-foreground">Highest spending outings</p>
                {outingRankings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No outing expenses</p>
                ) : (
                  <ul className="space-y-2">
                    {outingRankings.slice(0, 10).map((o, i) => (
                      <li key={o.id}>
                        <Link to={`/outings/${o.id}`} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:border-primary/40">
                          <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                          <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(o.category) }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{o.name}</p>
                            <p className="text-xs text-muted-foreground">{o.category} · {o.transactionCount} expenses · {o.percent}%</p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(o.spent)}</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </PremiumTabsContent>

        {/* ── Friends ──────────────────────────────────────────────────── */}
        <PremiumTabsContent value="friends">
          <div className="fintech-card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground">Friend Balances</h3>
            <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
              Net position with each friend across the filtered outings
            </p>
            {sortedFriends.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No friends yet"
                description="Add friends to split expenses and track balances."
                actionLabel="Go to Friends"
                onAction={() => navigate("/friends")}
              />
            ) : (
              <ul className="space-y-2">
                {sortedFriends.map((f) => {
                  const bal = friendBalances.get(f.id) ?? 0;
                  const positive = bal > 0.01;
                  const negative = bal < -0.01;
                  return (
                    <li key={f.id}>
                      <Link to={`/friends/details/${f.id}`} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:border-primary/40">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback seed={f.id} className="text-xs font-semibold">{f.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{getBalanceLabel(bal, getFirstName(f.name))}</p>
                        </div>
                        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", positive && "text-success", negative && "text-destructive", !positive && !negative && "text-muted-foreground")}>
                          {positive ? `+${formatCurrency(bal)}` : negative ? `-${formatCurrency(Math.abs(bal))}` : "Settled"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PremiumTabsContent>
      </PremiumTabs>
    </div>
  );
}

function PageTitle() {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Look back at every outing, or dig into the numbers.
      </p>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  if (options.length <= 1) return null;
  return (
    <label className="inline-flex shrink-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 rounded-lg border bg-card px-2.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary",
          value === "all" ? "border-border/60 text-muted-foreground" : "border-primary/40 text-primary"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function YearReviewCard({
  review, name,
}: {
  review: NonNullable<ReturnType<typeof useReportData>["yearReview"]>;
  name: string;
}) {
  const delta =
    review.previous && review.previous.totalSpent > 0
      ? Math.round(((review.totalSpent - review.previous.totalSpent) / review.previous.totalSpent) * 100)
      : null;

  return (
    <div className="fintech-card relative overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">{review.label}</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{review.outingCount}</span>{" "}
        {review.outingCount === 1 ? "outing" : "outings"} ·{" "}
        <span className="font-semibold text-foreground tabular-nums">{formatCurrency(review.totalSpent)}</span> spent ·{" "}
        {name} spent{" "}
        <span className="font-semibold text-foreground tabular-nums">{formatCurrency(review.yourSpent)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {review.biggest && (
          <Chip label="Biggest" value={`${review.biggest.name} · ${formatCurrency(review.biggest.amount)}`} />
        )}
        {review.topCategory && (
          <Chip label="Most often" value={`${review.topCategory.name} (${review.topCategory.count}×)`} />
        )}
        {review.busiestMonth && <Chip label="Busiest" value={review.busiestMonth} />}
        {delta !== null && review.previous && (
          <Chip
            label={`vs ${review.previous.label}`}
            value={`${delta > 0 ? "+" : ""}${delta}%`}
            tone={delta > 0 ? "up" : "down"}
          />
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate font-semibold",
          tone === "up" && "text-destructive",
          tone === "down" && "text-success",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </span>
  );
}
