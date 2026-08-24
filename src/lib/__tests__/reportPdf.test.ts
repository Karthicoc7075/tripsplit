import { describe, it, expect } from "vitest";
import { buildReportPdf } from "../reportPdf";
import { buildExportModel, type ExportMeta } from "../reportExport";
import type { Outing, Transaction } from "@/types";

const ME = "me";

const outing = (id: string, name: string, startDate: string): Outing => ({
  id,
  name,
  category: "Trip",
  date: startDate,
  status: "settled",
  startDate,
  members: [
    { id: ME, name: "Karthi P" },
    { id: "sanjay", name: "Sanjay Kumar" },
  ],
  createdAt: `${startDate}T04:00:00.000Z`,
  createdById: ME,
  createdByName: "Karthi P",
});

const tx = (id: string, outingId: string, i: number): Transaction => ({
  id,
  outingId,
  title: `Expense ${i}`,
  description: i % 3 === 0 ? "A note long enough to wrap inside its column" : undefined,
  amount: 100 + i,
  paidById: ME,
  paidByName: "Karthi P",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: (100 + i) / 2 },
    { memberId: "sanjay", amount: (100 + i) / 2 },
  ],
  date: "20 Aug 2026",
  time: "10:30",
  category: "Food",
  createdAt: "2026-08-20T05:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi P",
});

const meta: ExportMeta = {
  userName: "Karthi P",
  joinedAt: "2026-01-15T10:00:00.000Z",
  generatedAt: new Date(2026, 7, 24, 18, 5),
  outingCount: 2,
  filtersLabel: "Period: All Time",
  currencyCode: "INR",
};

describe("buildReportPdf", () => {
  it("produces a multi-page document with a cover and every outing", () => {
    const outings = [outing("goa", "Goa Trip", "2026-08-20"), outing("kerala", "Kerala Trip", "2026-09-02")];
    // Enough rows to force page breaks, which is where the repeating table
    // header and the "Page X of Y" second pass actually get exercised.
    const transactions = [
      ...Array.from({ length: 60 }, (_, i) => tx(`g${i}`, "goa", i)),
      ...Array.from({ length: 40 }, (_, i) => tx(`k${i}`, "kerala", i)),
    ];

    const model = buildExportModel({ outings, transactions, settlements: [], currentUserId: ME });
    const doc = buildReportPdf(model, meta);

    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    expect(doc.output("blob").size).toBeGreaterThan(1000);
  });

  it("still renders with no data at all", () => {
    const model = buildExportModel({
      outings: [],
      transactions: [],
      settlements: [],
      currentUserId: ME,
    });
    const doc = buildReportPdf(model, { ...meta, outingCount: 0, joinedAt: null });

    expect(doc.getNumberOfPages()).toBe(2);
  });
});
