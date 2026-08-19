import { describe, it, expect } from "vitest";
import { getTransactionDate, getSpendingTrend } from "../dashboard";
import type { Transaction } from "@/types";

const ME = "me";

/** Spent on 5 Aug, but typed into the app on 19 Aug. */
const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx1",
  outingId: "o1",
  title: "Hotel",
  amount: 900,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [{ memberId: ME, amount: 300 }],
  date: "5 Aug 2026",
  createdAt: "2026-08-19T10:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
  ...overrides,
});

describe("getTransactionDate", () => {
  it("uses the expense date the user entered, not when it was logged", () => {
    const d = getTransactionDate(tx());
    expect(d.getDate()).toBe(5);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getFullYear()).toBe(2026);
  });

  it("handles an ISO date string", () => {
    expect(getTransactionDate(tx({ date: "2026-08-05" })).getDate()).toBe(5);
  });

  it("falls back to createdAt when date is missing", () => {
    const d = getTransactionDate(tx({ date: "" }));
    expect(d.getDate()).toBe(19);
  });

  it("falls back to createdAt when date is unparseable", () => {
    const d = getTransactionDate(tx({ date: "Just created" }));
    expect(d.getDate()).toBe(19);
  });

  it("falls back when date is a raw timestamp string (legacy records)", () => {
    const d = getTransactionDate(tx({ date: "1787127286867" }));
    expect(d.getDate()).toBe(19);
  });
});

describe("getSpendingTrend", () => {
  it("buckets an expense into the month it was spent, not the month it was logged", () => {
    // Spent in the month before it was logged.
    const now = new Date();
    const spentMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    const t = tx({
      date: spentMonth.toISOString(),
      createdAt: now.toISOString(),
    });

    const trend = getSpendingTrend([t], ME, 6);
    const lastBucket = trend[trend.length - 1];   // current month
    const prevBucket = trend[trend.length - 2];   // month before

    expect(prevBucket.amount).toBe(300);
    expect(lastBucket.amount).toBe(0);
  });
});
