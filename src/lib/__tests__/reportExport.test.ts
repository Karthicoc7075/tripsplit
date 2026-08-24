import { describe, it, expect } from "vitest";
import { buildExportModel, buildTransactionsCsv, type ExportMeta } from "../reportExport";
import type { Outing, SettlementRecord, Transaction } from "@/types";

const ME = "me";
const SANJAY = "sanjay";

const outing = (over: Partial<Outing> = {}): Outing => ({
  id: "goa",
  name: "Goa Trip",
  category: "Trip",
  date: "20 Aug 2026",
  status: "settled",
  members: [
    { id: ME, name: "Karthi P" },
    { id: SANJAY, name: "Sanjay Kumar" },
  ],
  createdAt: "2026-08-20T04:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi P",
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  outingId: "goa",
  title: "Hotel",
  amount: 1200,
  paidById: ME,
  paidByName: "Karthi P",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 600 },
    { memberId: SANJAY, amount: 600 },
  ],
  date: "20 Aug 2026",
  time: "10:30",
  category: "Hotel",
  createdAt: "2026-08-20T05:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi P",
  ...over,
});

const settlement = (over: Partial<SettlementRecord> = {}): SettlementRecord => ({
  id: "s1",
  outingId: "goa",
  fromId: SANJAY,
  fromName: "Sanjay Kumar",
  toId: ME,
  toName: "Karthi P",
  amount: 400,
  type: "return",
  createdAt: "2026-08-20T11:00:00.000Z",
  recordedById: ME,
  recordedByName: "Karthi P",
  ...over,
});

const meta: ExportMeta = {
  userName: "Karthi P",
  joinedAt: "2026-01-15T10:00:00.000Z",
  generatedAt: new Date(2026, 7, 24, 18, 5),
  outingCount: 1,
  filtersLabel: "Period: All Time",
  currencyCode: "INR",
};

const build = (over: Partial<Parameters<typeof buildExportModel>[0]> = {}) =>
  buildExportModel({
    outings: [outing()],
    transactions: [tx()],
    settlements: [settlement()],
    currentUserId: ME,
    ...over,
  });

describe("buildExportModel", () => {
  it("groups every entry under its outing", () => {
    const model = build();
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].outing.name).toBe("Goa Trip");
    expect(model.sections[0].rows).toHaveLength(2);
    expect(model.rowCount).toBe(2);
  });

  it("orders outings by when they happened, not by name", () => {
    const model = build({
      outings: [
        outing({ id: "b", name: "Kerala Trip", startDate: "2026-09-01" }),
        outing({ id: "a", name: "Goa Trip", startDate: "2026-08-20" }),
        outing({ id: "c", name: "Bangalore Trip", startDate: "2026-10-05" }),
      ],
      transactions: [],
      settlements: [],
    });
    expect(model.sections.map((s) => s.outing.name)).toEqual([
      "Goa Trip",
      "Kerala Trip",
      "Bangalore Trip",
    ]);
  });

  it("orders an outing's entries oldest first, across expenses and settlements", () => {
    const model = build({
      transactions: [
        tx({ id: "lunch", title: "Lunch", time: "13:15", amount: 600 }),
        tx({ id: "hotel", title: "Hotel", time: "10:30", amount: 1200 }),
      ],
      settlements: [settlement()], // 4:30 PM local
    });
    expect(model.sections[0].rows.map((r) => r.title)).toEqual([
      "Hotel",
      "Lunch",
      "Sanjay Kumar paid Karthi P (You)",
    ]);
  });

  it("keeps a friend return identifiable as a reimbursement", () => {
    const model = build();
    const row = model.sections[0].rows.find((r) => r.id === "s1");
    expect(row?.kind).toBe("reimbursement");
    expect(row?.typeLabel).toBe("Reimbursement");
  });

  it("labels a payment to a friend as a settlement", () => {
    const model = build({
      settlements: [settlement({ type: "settle", fromId: ME, fromName: "Karthi P", toId: SANJAY, toName: "Sanjay Kumar" })],
    });
    const row = model.sections[0].rows.find((r) => r.id === "s1");
    expect(row?.typeLabel).toBe("Settlement");
  });

  it("shows the stored amount untouched", () => {
    const model = build({ transactions: [tx({ amount: 1234.56 })] });
    expect(model.sections[0].rows[0].amount).toBe(1234.56);
  });

  it("excludes settlements from an outing's total — they move money already counted", () => {
    const model = build();
    expect(model.sections[0].total).toBe(1200);
  });

  it("names each payer when several people chipped in", () => {
    const model = build({
      transactions: [
        tx({
          payments: [
            { memberId: ME, paidByName: "Karthi P", amount: 700 },
            { memberId: SANJAY, paidByName: "Sanjay Kumar", amount: 500 },
          ],
          paidByName: "Karthi P, Sanjay Kumar",
        }),
      ],
      settlements: [],
    });
    expect(model.sections[0].rows[0].paidBy).toBe("Karthi P (You), Sanjay Kumar");
  });

  it("lists split members by name only, with no share amounts", () => {
    const row = build().sections[0].rows[0];
    expect(row.splitWith).toBe("Karthi P (You), Sanjay Kumar");
    expect(row.splitWith).not.toMatch(/\d/);
  });

  it("drops outings the filters emptied when asked to", () => {
    const model = buildExportModel({
      outings: [outing({ id: "goa", name: "Goa Trip" }), outing({ id: "kerala", name: "Kerala Trip" })],
      transactions: [tx({ outingId: "goa" })],
      settlements: [],
      currentUserId: ME,
      dropEmptyOutings: true,
    });
    expect(model.sections.map((s) => s.outing.name)).toEqual(["Goa Trip"]);
  });

  it("keeps an empty outing on an unfiltered export, so the record stays complete", () => {
    const model = buildExportModel({
      outings: [outing({ id: "goa", name: "Goa Trip" }), outing({ id: "kerala", name: "Kerala Trip" })],
      transactions: [tx({ outingId: "goa" })],
      settlements: [],
      currentUserId: ME,
    });
    expect(model.sections).toHaveLength(2);
    expect(model.sections[1].rows).toHaveLength(0);
  });

  it("collects entries whose outing is gone under the unlinked list", () => {
    const model = build({
      transactions: [tx(), tx({ id: "orphan", outingId: "deleted", title: "Solo coffee" })],
    });
    expect(model.sections[0].rows.map((r) => r.id)).not.toContain("orphan");
    expect(model.unlinked.map((r) => r.title)).toEqual(["Solo coffee"]);
    expect(model.rowCount).toBe(3);
  });

  it("falls back to the entry clock only when the expense was logged the same day", () => {
    const sameDay = build({
      transactions: [tx({ time: undefined, createdAt: new Date(2026, 7, 20, 14, 5).toISOString() })],
      settlements: [],
    });
    expect(sameDay.sections[0].rows[0].time).toMatch(/2:05/);

    const backDated = build({
      transactions: [
        tx({ date: "18 Aug 2026", time: undefined, createdAt: new Date(2026, 7, 20, 14, 5).toISOString() }),
      ],
      settlements: [],
    });
    expect(backDated.sections[0].rows[0].time).toBe("");
  });
});

describe("buildTransactionsCsv", () => {
  it("writes one row per entry under a single header", () => {
    const csv = buildTransactionsCsv(build(), meta);
    const lines = csv.trim().split("\r\n");
    const headerIndex = lines.findIndex((l) => l.startsWith('"Date"'));

    expect(headerIndex).toBeGreaterThan(-1);
    // Two entries plus the outing's closing total.
    expect(lines.length - headerIndex - 1).toBe(3);
    expect(lines[headerIndex]).toContain('"Transaction ID"');
  });

  it("carries the report metadata above the table", () => {
    const csv = buildTransactionsCsv(build(), meta);
    expect(csv).toContain('"User Name","Karthi P"');
    expect(csv).toContain('"Joined TripSplit","15 Jan 2026"');
    expect(csv).toContain('"Total Outings",1');
  });

  it("states the filters the report was pulled under", () => {
    const csv = buildTransactionsCsv(build(), {
      ...meta,
      filtersLabel: "Period: 3 Months | Year: 2026",
    });
    expect(csv).toContain('"Filters Applied","Period: 3 Months | Year: 2026"');
  });

  it("never names SpentX", () => {
    expect(buildTransactionsCsv(build(), meta)).not.toContain("SpentX");
  });

  it("writes amounts as bare numbers Excel can sum", () => {
    const csv = buildTransactionsCsv(build({ transactions: [tx({ amount: 1200 })] }), meta);
    expect(csv).toContain(",1200,");
    expect(csv).not.toContain("₹");
  });

  it("escapes quotes and commas in names", () => {
    const csv = buildTransactionsCsv(
      build({ transactions: [tx({ title: 'Dinner, "the good one"' })], settlements: [] }),
      meta
    );
    expect(csv).toContain('"Dinner, ""the good one"""');
  });

  it("neutralises a leading = so a spreadsheet cannot run it as a formula", () => {
    const csv = buildTransactionsCsv(
      build({ transactions: [tx({ title: "=HYPERLINK(1)" })], settlements: [] }),
      meta
    );
    expect(csv).toContain('"\'=HYPERLINK(1)"');
  });

  it("closes each outing with its total spent", () => {
    const csv = buildTransactionsCsv(
      buildExportModel({
        outings: [
          outing({ id: "goa", name: "Goa Trip", startDate: "2026-08-20" }),
          outing({ id: "kerala", name: "Kerala Trip", startDate: "2026-09-02" }),
        ],
        transactions: [
          tx({ id: "g1", outingId: "goa", amount: 1200 }),
          tx({ id: "g2", outingId: "goa", amount: 600 }),
          tx({ id: "k1", outingId: "kerala", amount: 950 }),
        ],
        settlements: [],
        currentUserId: ME,
      }),
      meta
    );

    const totals = csv
      .trim()
      .split("\r\n")
      .filter((l) => l.includes('"Outing Total"'));

    expect(totals).toHaveLength(2);
    expect(totals[0]).toContain('"Goa Trip — Total Spent","Outing Total",1800');
    expect(totals[0]).toContain('"2 entries"');
    expect(totals[1]).toContain('"Kerala Trip — Total Spent","Outing Total",950');
  });

  it("leaves settlements out of an outing's total", () => {
    const csv = buildTransactionsCsv(build(), meta);
    const total = csv
      .trim()
      .split("\r\n")
      .find((l) => l.includes('"Outing Total"'));
    // 1200 expense + a 400 reimbursement that moves money already counted.
    expect(total).toContain(",1200,");
  });

  it("totals the unlinked entries too", () => {
    const csv = buildTransactionsCsv(
      build({
        transactions: [tx(), tx({ id: "orphan", outingId: "gone", amount: 275 })],
        settlements: [],
      }),
      meta
    );
    expect(csv).toContain('"Normal Transactions — Total Spent","Outing Total",275');
  });

  it("writes no total block when there are no unlinked entries", () => {
    const csv = buildTransactionsCsv(build(), meta);
    expect(csv).not.toContain("Normal Transactions");
  });

  it("includes unlinked entries after the outing rows", () => {
    const csv = buildTransactionsCsv(
      build({ transactions: [tx(), tx({ id: "orphan", outingId: "gone", title: "Solo coffee" })] }),
      meta
    );
    const lines = csv.trim().split("\r\n");
    expect(lines[lines.length - 2]).toContain("Solo coffee");
    expect(lines[lines.length - 1]).toContain('"Outing Total"');
  });
});
