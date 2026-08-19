import type { Outing, SettlementRecord, Transaction } from "@/types";
import { getTransactionDate } from "@/lib/dashboard";
import { getOutingMembers } from "@/lib/members";
import { parseLocalDate } from "@/lib/format";

/**
 * Every knob on the Reports page in one object, mirrored into the URL.
 *
 * Keeping this as a single serialisable shape is what lets the page grow: a new
 * filter is a new field here plus a control, never a restructure. It also makes
 * any Reports view shareable, bookmarkable, and survivable across a refresh.
 */
export type ReportTab = "memories" | "insights" | "friends";

export interface ReportFilters {
  tab: ReportTab;
  /** "all" or a four-digit year. */
  year: string;
  query: string;
  category: string;
  memberId: string;
  /** Insights-only window. */
  period: "3m" | "6m" | "12m" | "all";
  includeArchived: boolean;
}

export const DEFAULT_FILTERS: ReportFilters = {
  tab: "memories",
  year: "all",
  query: "",
  category: "all",
  memberId: "all",
  period: "6m",
  includeArchived: false,
};

const TABS: ReportTab[] = ["memories", "insights", "friends"];
const PERIODS: ReportFilters["period"][] = ["3m", "6m", "12m", "all"];

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const tab = params.get("tab") as ReportTab | null;
  const period = params.get("period") as ReportFilters["period"] | null;
  return {
    tab: tab && TABS.includes(tab) ? tab : DEFAULT_FILTERS.tab,
    year: params.get("year") ?? DEFAULT_FILTERS.year,
    query: params.get("q") ?? DEFAULT_FILTERS.query,
    category: params.get("cat") ?? DEFAULT_FILTERS.category,
    memberId: params.get("member") ?? DEFAULT_FILTERS.memberId,
    period: period && PERIODS.includes(period) ? period : DEFAULT_FILTERS.period,
    includeArchived: params.get("archived") === "1",
  };
}

/** Only non-default values are written, so a clean view has a clean URL. */
export function serializeReportFilters(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== DEFAULT_FILTERS.tab) params.set("tab", filters.tab);
  if (filters.year !== DEFAULT_FILTERS.year) params.set("year", filters.year);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.category !== DEFAULT_FILTERS.category) params.set("cat", filters.category);
  if (filters.memberId !== DEFAULT_FILTERS.memberId) params.set("member", filters.memberId);
  if (filters.period !== DEFAULT_FILTERS.period) params.set("period", filters.period);
  if (filters.includeArchived) params.set("archived", "1");
  return params;
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return (
    filters.year !== DEFAULT_FILTERS.year ||
    filters.query.trim() !== "" ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.memberId !== DEFAULT_FILTERS.memberId ||
    filters.includeArchived
  );
}

/** Date an outing is filed under: when it happened, falling back to when it was created. */
export function getOutingDate(outing: Outing): Date {
  return (
    parseLocalDate(outing.startDate) ??
    parseLocalDate(outing.createdAt) ??
    new Date(outing.createdAt)
  );
}

export function getAvailableYears(outings: Outing[]): string[] {
  const years = new Set<string>();
  for (const o of outings) years.add(String(getOutingDate(o).getFullYear()));
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

/** Backup scratch outings are bookkeeping, not memories. */
export function isRealOuting(outing: Outing): boolean {
  const haystack = `${outing.name} ${outing.description ?? ""} ${outing.category}`.toLowerCase();
  return !haystack.includes("backup");
}

function matchesQuery(
  outing: Outing,
  transactions: Transaction[],
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    outing.name,
    outing.category,
    outing.location ?? "",
    outing.description ?? "",
    outing.note ?? "",
    ...(outing.tags ?? []),
    ...getOutingMembers(outing).map((m) => m.name),
  ];
  if (fields.some((f) => f.toLowerCase().includes(q))) return true;

  // Searching an expense title should surface the outing that holds it.
  return transactions.some(
    (t) =>
      t.outingId === outing.id &&
      (t.title.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q))
  );
}

export function applyOutingFilters(
  outings: Outing[],
  transactions: Transaction[],
  filters: ReportFilters
): Outing[] {
  return outings.filter((o) => {
    if (!isRealOuting(o)) return false;
    if (!filters.includeArchived && o.archived) return false;
    if (filters.year !== "all" && String(getOutingDate(o).getFullYear()) !== filters.year) {
      return false;
    }
    if (filters.category !== "all" && o.category !== filters.category) return false;
    if (
      filters.memberId !== "all" &&
      !getOutingMembers(o).some((m) => m.id === filters.memberId)
    ) {
      return false;
    }
    return matchesQuery(o, transactions, filters.query);
  });
}

export interface MemorySection {
  /** Stable key, e.g. "2026-07" or "pinned". */
  key: string;
  label: string;
  outings: Outing[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Newest first, grouped by month — the shape memory actually has.
 * Pinned outings are lifted into their own section at the top.
 */
export function groupOutingsByMonth(outings: Outing[]): MemorySection[] {
  const pinned = outings.filter((o) => o.pinned);
  const rest = outings.filter((o) => !o.pinned);

  const buckets = new Map<string, Outing[]>();
  for (const o of rest) {
    const d = getOutingDate(o);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const list = buckets.get(key);
    if (list) list.push(o);
    else buckets.set(key, [o]);
  }

  const sections: MemorySection[] = Array.from(buckets.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      const [year, month] = key.split("-");
      return {
        key,
        label: `${MONTHS[Number(month)]} ${year}`,
        outings: list.sort(
          (a, b) => getOutingDate(b).getTime() - getOutingDate(a).getTime()
        ),
      };
    });

  if (pinned.length > 0) {
    sections.unshift({
      key: "pinned",
      label: "Pinned",
      outings: pinned.sort(
        (a, b) => getOutingDate(b).getTime() - getOutingDate(a).getTime()
      ),
    });
  }

  return sections;
}

export interface OutingMemory {
  outing: Outing;
  totalSpent: number;
  yourSpent: number;
  yourShare: number;
  net: number;
  transactionCount: number;
  memberCount: number;
  /** Largest categories first, as a share of the outing total. */
  categoryMix: { name: string; value: number; percent: number }[];
  receiptUrls: string[];
  firstDate: Date | null;
  lastDate: Date | null;
}

export function buildOutingMemory(
  outing: Outing,
  transactions: Transaction[],
  settlementRecords: SettlementRecord[],
  currentUserId: string
): OutingMemory {
  const txs = transactions.filter((t) => t.outingId === outing.id);
  const records = settlementRecords.filter((r) => r.outingId === outing.id);

  let totalSpent = 0;
  let paid = 0;
  let share = 0;
  const categories = new Map<string, number>();
  const receiptUrls: string[] = [];
  let first: number | null = null;
  let last: number | null = null;

  for (const tx of txs) {
    totalSpent += tx.amount;

    const payments = tx.payments?.length
      ? tx.payments
      : [{ memberId: tx.paidById, amount: tx.amount }];
    for (const p of payments) {
      if (p.memberId === currentUserId) paid += p.amount;
    }
    share += tx.splits.find((s) => s.memberId === currentUserId)?.amount ?? 0;

    const cat = tx.category ?? "Other";
    categories.set(cat, (categories.get(cat) ?? 0) + tx.amount);

    if (tx.receiptUrl) receiptUrls.push(tx.receiptUrl);

    const time = getTransactionDate(tx).getTime();
    if (first == null || time < first) first = time;
    if (last == null || time > last) last = time;
  }

  let settledIn = 0;
  let settledOut = 0;
  for (const r of records) {
    if (r.fromId === currentUserId) settledOut += r.amount;
    if (r.toId === currentUserId) settledIn += r.amount;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const categoryMix = Array.from(categories.entries())
    .map(([name, value]) => ({
      name,
      value: round(value),
      percent: totalSpent > 0 ? Math.round((value / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    outing,
    totalSpent: round(totalSpent),
    yourSpent: round(paid + settledOut - settledIn),
    yourShare: round(share),
    net: round(paid - share + settledOut - settledIn),
    transactionCount: txs.length,
    memberCount: getOutingMembers(outing).length,
    categoryMix,
    receiptUrls: receiptUrls.slice(0, 4),
    firstDate: first != null ? new Date(first) : null,
    lastDate: last != null ? new Date(last) : null,
  };
}
