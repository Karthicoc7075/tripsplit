import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  applyOutingFilters,
  buildOutingMemory,
  getAvailableYears,
  getOutingDate,
  groupOutingsByMonth,
  hasActiveFilters,
  isRealOuting,
  parseReportFilters,
  serializeReportFilters,
  type ReportFilters,
} from "../reportFilters";
import type { Outing, SettlementRecord, Transaction } from "@/types";

const ME = "me";

const outing = (over: Partial<Outing> = {}): Outing => ({
  id: "o1",
  name: "Goa Trip",
  category: "Trip",
  date: "",
  status: "settled",
  members: [
    { id: ME, name: "Karthi" },
    { id: "f1", name: "Arun" },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  startDate: "2026-08-05",
  createdById: ME,
  createdByName: "Karthi",
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  outingId: "o1",
  title: "Hotel",
  amount: 900,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 450 },
    { memberId: "f1", amount: 450 },
  ],
  category: "Accommodation",
  date: "5 Aug 2026",
  createdAt: "2026-08-05T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
  ...over,
});

describe("filter URL round-trip", () => {
  it("keeps a default view out of the URL", () => {
    expect(serializeReportFilters(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("round-trips every field", () => {
    const filters: ReportFilters = {
      tab: "insights",
      year: "2025",
      query: "goa",
      category: "Trip",
      memberId: "f1",
      period: "12m",
      includeArchived: true,
    };
    const parsed = parseReportFilters(serializeReportFilters(filters));
    expect(parsed).toEqual(filters);
  });

  it("falls back to defaults on junk input", () => {
    const parsed = parseReportFilters(new URLSearchParams("tab=hack&period=99y"));
    expect(parsed.tab).toBe("memories");
    expect(parsed.period).toBe("6m");
  });

  it("reports whether filters narrow anything", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: "goa" })).toBe(true);
    // Switching tab or period is not a narrowing filter.
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, tab: "friends", period: "3m" })).toBe(false);
  });
});

describe("applyOutingFilters", () => {
  const goa = outing();
  const dinner = outing({
    id: "o2",
    name: "Saturday Dinner",
    category: "Restaurant",
    startDate: "2025-12-20",
    members: [{ id: ME, name: "Karthi" }],
  });
  const all = [goa, dinner];
  const txs = [tx(), tx({ id: "t2", outingId: "o2", title: "Biryani", amount: 500 })];

  it("returns everything by default", () => {
    expect(applyOutingFilters(all, txs, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it("filters by year", () => {
    const r = applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, year: "2025" });
    expect(r.map((o) => o.id)).toEqual(["o2"]);
  });

  it("filters by category", () => {
    const r = applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, category: "Trip" });
    expect(r.map((o) => o.id)).toEqual(["o1"]);
  });

  it("filters by member", () => {
    const r = applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, memberId: "f1" });
    expect(r.map((o) => o.id)).toEqual(["o1"]);
  });

  it("searches outing names", () => {
    expect(applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, query: "goa" })).toHaveLength(1);
  });

  it("searches member names", () => {
    const r = applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, query: "arun" });
    expect(r.map((o) => o.id)).toEqual(["o1"]);
  });

  it("finds an outing by an expense inside it", () => {
    const r = applyOutingFilters(all, txs, { ...DEFAULT_FILTERS, query: "biryani" });
    expect(r.map((o) => o.id)).toEqual(["o2"]);
  });

  it("hides archived outings unless asked", () => {
    const archived = [outing({ archived: true }), dinner];
    expect(applyOutingFilters(archived, txs, DEFAULT_FILTERS)).toHaveLength(1);
    expect(
      applyOutingFilters(archived, txs, { ...DEFAULT_FILTERS, includeArchived: true })
    ).toHaveLength(2);
  });

  it("excludes backup scratch outings", () => {
    expect(isRealOuting(outing({ name: "Goa Trip backup" }))).toBe(false);
    expect(isRealOuting(goa)).toBe(true);
  });
});

describe("grouping", () => {
  it("groups by month, newest first", () => {
    const sections = groupOutingsByMonth([
      outing({ id: "a", startDate: "2026-08-05" }),
      outing({ id: "b", startDate: "2026-07-01" }),
      outing({ id: "c", startDate: "2026-08-20" }),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["August 2026", "July 2026"]);
    expect(sections[0].outings.map((o) => o.id)).toEqual(["c", "a"]);
  });

  it("lifts pinned outings into their own section at the top", () => {
    const sections = groupOutingsByMonth([
      outing({ id: "a", startDate: "2026-08-05" }),
      outing({ id: "old", startDate: "2024-01-01", pinned: true }),
    ]);
    expect(sections[0].label).toBe("Pinned");
    expect(sections[0].outings.map((o) => o.id)).toEqual(["old"]);
  });

  it("files an outing under startDate, falling back to createdAt", () => {
    expect(getOutingDate(outing()).getFullYear()).toBe(2026);
    const noStart = outing({ startDate: undefined, createdAt: "2023-03-04T00:00:00.000Z" });
    expect(getOutingDate(noStart).getFullYear()).toBe(2023);
  });

  it("lists years newest first", () => {
    const years = getAvailableYears([
      outing({ startDate: "2024-01-01" }),
      outing({ startDate: "2026-01-01" }),
      outing({ startDate: "2025-01-01" }),
    ]);
    expect(years).toEqual(["2026", "2025", "2024"]);
  });
});

describe("buildOutingMemory", () => {
  const settlement: SettlementRecord = {
    id: "s1",
    outingId: "o1",
    fromId: "f1",
    fromName: "Arun",
    toId: ME,
    toName: "Karthi",
    amount: 200,
    type: "settle",
    createdAt: "2026-08-10T00:00:00.000Z",
    recordedById: "f1",
    recordedByName: "Arun",
  };

  it("summarises one outing, settlements included", () => {
    const m = buildOutingMemory(outing(), [tx()], [settlement], ME);
    expect(m.totalSpent).toBe(900);
    expect(m.yourShare).toBe(450);
    expect(m.yourSpent).toBe(700); // paid 900 − 200 received back
    expect(m.net).toBe(250); // 900 − 450 − 200 still owed
    expect(m.transactionCount).toBe(1);
    expect(m.memberCount).toBe(2);
  });

  it("builds a category mix that sums to 100%", () => {
    const m = buildOutingMemory(
      outing(),
      [tx({ amount: 600, category: "Food" }), tx({ id: "t2", amount: 400, category: "Transport" })],
      [],
      ME
    );
    expect(m.categoryMix.map((c) => c.name)).toEqual(["Food", "Transport"]);
    expect(m.categoryMix.reduce((s, c) => s + c.percent, 0)).toBe(100);
  });

  it("collects up to four receipts", () => {
    const txs = Array.from({ length: 6 }, (_, i) =>
      tx({ id: `t${i}`, receiptUrl: `http://x/${i}.png` })
    );
    expect(buildOutingMemory(outing(), txs, [], ME).receiptUrls).toHaveLength(4);
  });

  it("handles an outing with no expenses", () => {
    const m = buildOutingMemory(outing(), [], [], ME);
    expect(m).toMatchObject({ totalSpent: 0, yourSpent: 0, net: 0, transactionCount: 0 });
    expect(m.categoryMix).toEqual([]);
  });
});

describe("archived round-trip", () => {
  const txs: Transaction[] = [];

  it("an archived outing hides, and un-archiving brings it back", () => {
    const archived = outing({ archived: true });
    expect(applyOutingFilters([archived], txs, DEFAULT_FILTERS)).toHaveLength(0);

    // Un-archiving must write `false`, not `undefined` — `undefined` is stripped
    // before the Firestore write and would leave the outing archived forever.
    const unarchived = { ...archived, archived: false };
    expect(applyOutingFilters([unarchived], txs, DEFAULT_FILTERS)).toHaveLength(1);
  });

  it("treats a missing archived flag as not archived", () => {
    expect(applyOutingFilters([outing()], txs, DEFAULT_FILTERS)).toHaveLength(1);
  });

  it("searches note and tag text", () => {
    const tagged = outing({ note: "Best sunset", tags: ["family", "beach"] });
    expect(applyOutingFilters([tagged], txs, { ...DEFAULT_FILTERS, query: "sunset" })).toHaveLength(1);
    expect(applyOutingFilters([tagged], txs, { ...DEFAULT_FILTERS, query: "beach" })).toHaveLength(1);
    expect(applyOutingFilters([tagged], txs, { ...DEFAULT_FILTERS, query: "mountain" })).toHaveLength(0);
  });
});
