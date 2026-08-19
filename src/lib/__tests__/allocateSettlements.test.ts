import { describe, it, expect } from "vitest";
import { allocateSettlements } from "../balances";
import type { SettlementRecord, Transaction } from "@/types";

const ME = "me";

/** Three expenses, ₹100 owed on each, oldest first. */
const tx = (id: string, day: number, title: string): Transaction => ({
  id,
  outingId: "o1",
  title,
  amount: 200,
  paidById: "f1",
  paidByName: "Arun",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 100 },
    { memberId: "f1", amount: 100 },
  ],
  date: `${day} Aug 2026`,
  createdAt: `2026-08-0${day}T00:00:00.000Z`,
  createdById: "f1",
  createdByName: "Arun",
});

const all = [tx("t1", 1, "Hotel"), tx("t2", 2, "Dinner"), tx("t3", 3, "Taxi")];

const settle = (amount: number): SettlementRecord => ({
  id: `s-${amount}`,
  outingId: "o1",
  fromId: ME,
  fromName: "Karthi",
  toId: "f1",
  toName: "Arun",
  amount,
  type: "settle",
  createdAt: "2026-08-05T00:00:00.000Z",
  recordedById: ME,
  recordedByName: "Karthi",
});

describe("allocateSettlements", () => {
  it("with nothing paid, every expense is open", () => {
    const a = allocateSettlements(ME, all, []);
    expect(a.totalOwed).toBe(300);
    expect(a.totalPaid).toBe(0);
    expect(a.totalRemaining).toBe(300);
    expect(a.transactions.map((t) => t.status)).toEqual(["open", "open", "open"]);
  });

  it("clears the oldest expense first", () => {
    const a = allocateSettlements(ME, all, [settle(100)]);
    expect(a.transactions.map((t) => t.status)).toEqual(["settled", "open", "open"]);
    expect(a.transactions[0].title).toBe("Hotel");
    expect(a.totalRemaining).toBe(200);
  });

  it("60% of the total settles the first and part of the second", () => {
    // 60% of ₹300 = ₹180 → Hotel fully (100), Dinner partly (80).
    const a = allocateSettlements(ME, all, [settle(180)]);
    expect(a.transactions[0]).toMatchObject({ title: "Hotel", covered: 100, remaining: 0, status: "settled" });
    expect(a.transactions[1]).toMatchObject({ title: "Dinner", covered: 80, remaining: 20, status: "partial" });
    expect(a.transactions[2]).toMatchObject({ title: "Taxi", covered: 0, remaining: 100, status: "open" });
    expect(a.totalRemaining).toBe(120);
  });

  it("sums multiple settlements into one pool", () => {
    const a = allocateSettlements(ME, all, [settle(100), settle(50)]);
    expect(a.transactions[0].status).toBe("settled");
    expect(a.transactions[1]).toMatchObject({ covered: 50, remaining: 50, status: "partial" });
  });

  it("money returned to the member reduces what they have settled", () => {
    const returned: SettlementRecord = {
      ...settle(60),
      id: "ret",
      fromId: "f1",
      fromName: "Arun",
      toId: ME,
      toName: "Karthi",
    };
    const a = allocateSettlements(ME, all, [settle(100), returned]);
    expect(a.transactions[0]).toMatchObject({ covered: 40, remaining: 60, status: "partial" });
  });

  it("paying everything settles every expense", () => {
    const a = allocateSettlements(ME, all, [settle(300)]);
    expect(a.transactions.every((t) => t.status === "settled")).toBe(true);
    expect(a.totalRemaining).toBe(0);
  });

  it("overpaying never reports more paid than owed", () => {
    const a = allocateSettlements(ME, all, [settle(500)]);
    expect(a.totalPaid).toBe(300);
    expect(a.totalRemaining).toBe(0);
  });

  it("ignores expenses the member does not owe on", () => {
    const paidByMe: Transaction = {
      ...tx("t4", 4, "Snacks"),
      paidById: ME,
      paidByName: "Karthi",
    };
    const a = allocateSettlements(ME, [...all, paidByMe], []);
    expect(a.transactions.map((t) => t.title)).toEqual(["Hotel", "Dinner", "Taxi"]);
  });

  it("orders by the supplied date, not insertion order", () => {
    const shuffled = [all[2], all[0], all[1]];
    const a = allocateSettlements(ME, shuffled, [settle(100)]);
    expect(a.transactions[0].title).toBe("Hotel");
    expect(a.transactions[0].status).toBe("settled");
  });

  it("handles a member with nothing owed", () => {
    const a = allocateSettlements("nobody", all, [settle(100)]);
    expect(a).toMatchObject({ totalOwed: 0, totalRemaining: 0 });
    expect(a.transactions).toEqual([]);
  });
});
