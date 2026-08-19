import { describe, it, expect } from "vitest";
import { getMemberCashFlow, getMemberPaidAndShare } from "../outing";
import { computeMemberBalances } from "../balances";
import type { OutingMember, SettlementRecord, Transaction } from "@/types";

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
