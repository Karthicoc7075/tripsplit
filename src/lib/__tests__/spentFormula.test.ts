import { describe, it, expect } from "vitest";
import { getMemberCashFlow } from "../outing";
import type { SettlementRecord, Transaction } from "@/types";

const ME = "me";

/** I paid ₹4,000 for the hotel, split 4 ways (₹1,000 each). */
const hotel: Transaction = {
  id: "t1",
  outingId: "o1",
  title: "Hotel",
  amount: 4000,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 1000 },
    { memberId: "f1", amount: 1000 },
    { memberId: "f2", amount: 1000 },
    { memberId: "f3", amount: 1000 },
  ],
  date: "5 Aug 2026",
  createdAt: "2026-08-05T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
};

const record = (
  fromId: string,
  toId: string,
  amount: number,
  id: string
): SettlementRecord => ({
  id,
  outingId: "o1",
  fromId,
  fromName: fromId,
  toId,
  toName: toId,
  amount,
  type: "settle",
  createdAt: "2026-08-06T00:00:00.000Z",
  recordedById: fromId,
  recordedByName: fromId,
});

describe("Your Spent = paid − return + settle", () => {
  it("with no settlements it is just what was paid", () => {
    const flow = getMemberCashFlow(ME, [hotel]);
    expect(flow.paid).toBe(4000);
    expect(flow.cashOut).toBe(4000);
  });

  it("money returned to me reduces it", () => {
    // f1 returns ₹900 → 4000 − 900
    const flow = getMemberCashFlow(ME, [hotel], [record("f1", ME, 900, "r1")]);
    expect(flow.settledIn).toBe(900);
    expect(flow.cashOut).toBe(3100);
  });

  it("money I settle out increases it", () => {
    // I pay f1 ₹500 → 4000 + 500
    const flow = getMemberCashFlow(ME, [hotel], [record(ME, "f1", 500, "s1")]);
    expect(flow.settledOut).toBe(500);
    expect(flow.cashOut).toBe(4500);
  });

  it("both directions together", () => {
    // 4000 − 900 (back from f1) + 500 (settled to f2)
    const flow = getMemberCashFlow(ME, [hotel], [
      record("f1", ME, 900, "r1"),
      record(ME, "f2", 500, "s1"),
    ]);
    expect(flow.paid).toBe(4000);
    expect(flow.settledIn).toBe(900);
    expect(flow.settledOut).toBe(500);
    expect(flow.cashOut).toBe(3600);
    expect(flow.cashOut).toBe(flow.paid - flow.settledIn + flow.settledOut);
  });

  it("once everyone repays, spent equals my own share", () => {
    // All three friends return ₹1,000 each → 4000 − 3000 = 1000 = my share
    const flow = getMemberCashFlow(ME, [hotel], [
      record("f1", ME, 1000, "r1"),
      record("f2", ME, 1000, "r2"),
      record("f3", ME, 1000, "r3"),
    ]);
    expect(flow.cashOut).toBe(1000);
    expect(flow.cashOut).toBe(flow.share);
    expect(flow.net).toBe(0);
  });
});
