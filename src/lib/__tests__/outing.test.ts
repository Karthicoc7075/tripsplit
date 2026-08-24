import { describe, it, expect } from "vitest";
import {
  getMemberCashFlow,
  getMemberPaidAndShare,
  hasOutingEnded,
  daysSinceOutingEnded,
  getBudgetOutcome,
} from "../outing";
import { computeMemberBalances } from "../balances";
import type { Outing, OutingMember, SettlementRecord, Transaction } from "@/types";

/** Me, Friend A, Friend B. I pay a 900 hotel bill, split equally 300 each. */
const ME = "me";
const A = "a";
const B = "b";

const members: OutingMember[] = [
  { id: ME, name: "Karthi" },
  { id: A, name: "Arun" },
  { id: B, name: "Priya" },
];

const hotel: Transaction = {
  id: "tx1",
  outingId: "o1",
  title: "Hotel",
  amount: 900,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 300 },
    { memberId: A, amount: 300 },
    { memberId: B, amount: 300 },
  ],
  date: "1 Aug 2026",
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
};

const settlement = (fromId: string, toId: string, amount: number): SettlementRecord => ({
  id: `s-${fromId}-${toId}`,
  outingId: "o1",
  fromId,
  fromName: fromId,
  toId,
  toName: toId,
  amount,
  type: "settle",
  createdAt: "2026-08-02T00:00:00.000Z",
  recordedById: fromId,
  recordedByName: fromId,
});

describe("getMemberCashFlow", () => {
  it("before anyone settles: only the payer has cash out", () => {
    const me = getMemberCashFlow(ME, [hotel]);
    expect(me).toMatchObject({ paid: 900, share: 300, settledIn: 0, settledOut: 0, cashOut: 900, net: 600 });

    const a = getMemberCashFlow(A, [hotel]);
    expect(a).toMatchObject({ paid: 0, share: 300, cashOut: 0, net: -300 });
  });

  it("after friend A settles 300, cash out shifts from me to A", () => {
    const records = [settlement(A, ME, 300)];

    const me = getMemberCashFlow(ME, [hotel], records);
    expect(me).toMatchObject({ paid: 900, share: 300, settledIn: 300, settledOut: 0, cashOut: 600, net: 300 });

    const a = getMemberCashFlow(A, [hotel], records);
    expect(a).toMatchObject({ paid: 0, share: 300, settledIn: 0, settledOut: 300, cashOut: 300, net: 0 });

    const b = getMemberCashFlow(B, [hotel], records);
    expect(b).toMatchObject({ cashOut: 0, net: -300 });
  });

  it("once everyone settles, cashOut converges to share and net goes to zero", () => {
    const records = [settlement(A, ME, 300), settlement(B, ME, 300)];

    for (const id of [ME, A, B]) {
      const flow = getMemberCashFlow(id, [hotel], records);
      expect(flow.cashOut).toBe(flow.share);
      expect(flow.net).toBe(0);
    }
  });

  it("cashOut across all members always sums to the total spent", () => {
    const records = [settlement(A, ME, 300)];
    const total = [ME, A, B].reduce(
      (sum, id) => sum + getMemberCashFlow(id, [hotel], records).cashOut,
      0
    );
    expect(total).toBe(900);
  });

  it("net agrees with computeMemberBalances", () => {
    const records = [settlement(A, ME, 300)];
    const balances = computeMemberBalances(members, [hotel], records);

    for (const m of members) {
      expect(getMemberCashFlow(m.id, [hotel], records).net).toBe(
        balances.find((b) => b.memberId === m.id)?.balance
      );
    }
  });

  it("splits `paid` across multiple payers", () => {
    const shared: Transaction = {
      ...hotel,
      payments: [
        { memberId: ME, paidByName: "Karthi", amount: 600 },
        { memberId: A, paidByName: "Arun", amount: 300 },
      ],
    };
    expect(getMemberCashFlow(ME, [shared]).paid).toBe(600);
    expect(getMemberCashFlow(A, [shared]).paid).toBe(300);
    expect(getMemberCashFlow(B, [shared]).paid).toBe(0);
  });

  it("ignores settlements that do not involve the member", () => {
    const records = [settlement(A, B, 300)];
    expect(getMemberCashFlow(ME, [hotel], records)).toMatchObject({
      settledIn: 0,
      settledOut: 0,
      cashOut: 900,
    });
  });

  it("getMemberPaidAndShare stays backward compatible", () => {
    expect(getMemberPaidAndShare(ME, [hotel])).toEqual({ paid: 900, share: 300 });
    expect(getMemberPaidAndShare(A, [hotel])).toEqual({ paid: 0, share: 300 });
  });
});

describe("outing completion by date", () => {
  const outing = (dates: Partial<Outing>): Outing => ({
    id: "o1",
    name: "Goa",
    category: "Trip",
    date: "",
    status: "ongoing",
    members,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...dates,
  });

  const today = new Date(2026, 7, 24); // 24 Aug 2026, local

  it("is over once the last day is behind us", () => {
    expect(hasOutingEnded(outing({ startDate: "2026-08-20", endDate: "2026-08-23" }), today)).toBe(true);
  });

  it("is not over on the final day itself", () => {
    expect(hasOutingEnded(outing({ startDate: "2026-08-20", endDate: "2026-08-24" }), today)).toBe(false);
  });

  it("is not over while it is still ahead", () => {
    expect(hasOutingEnded(outing({ startDate: "2026-09-01", endDate: "2026-09-05" }), today)).toBe(false);
  });

  it("falls back to the start date when there is no end date", () => {
    expect(hasOutingEnded(outing({ startDate: "2026-08-23" }), today)).toBe(true);
    expect(hasOutingEnded(outing({ startDate: "2026-08-24" }), today)).toBe(false);
  });

  it("never ends an outing with no dates at all", () => {
    expect(hasOutingEnded(outing({}), today)).toBe(false);
  });

  it("counts the days since it ended", () => {
    expect(daysSinceOutingEnded(outing({ endDate: "2026-08-23" }), today)).toBe(1);
    expect(daysSinceOutingEnded(outing({ endDate: "2026-08-24" }), today)).toBe(0);
    expect(daysSinceOutingEnded(outing({}), today)).toBeNull();
  });
});

describe("getBudgetOutcome", () => {
  it("reports what was saved as a share of the budget", () => {
    const outcome = getBudgetOutcome(20000, 15000)!;
    expect(outcome.isOver).toBe(false);
    expect(outcome.saved).toBe(5000);
    expect(outcome.savedPct).toBe(25);
    expect(outcome.overBy).toBe(0);
    expect(outcome.usedPct).toBe(75);
  });

  it("reports the overrun as a share of the budget, not of the spend", () => {
    const outcome = getBudgetOutcome(20000, 25000)!;
    expect(outcome.isOver).toBe(true);
    expect(outcome.overBy).toBe(5000);
    expect(outcome.overPct).toBe(25);
    expect(outcome.saved).toBe(0);
    expect(outcome.usedPct).toBe(100); // capped for the meter
  });

  it("treats spending the budget exactly as neither saved nor over", () => {
    const outcome = getBudgetOutcome(20000, 20000)!;
    expect(outcome.isOver).toBe(false);
    expect(outcome.saved).toBe(0);
    expect(outcome.savedPct).toBe(0);
  });

  it("has nothing to say without a budget", () => {
    expect(getBudgetOutcome(undefined, 5000)).toBeNull();
    expect(getBudgetOutcome(0, 5000)).toBeNull();
  });
});
