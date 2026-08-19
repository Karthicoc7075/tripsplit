import { describe, it, expect } from "vitest";
import {
  computeSplits,
  computeMemberBalances,
  simplifyDebts,
  getOutingTotalSpent,
  getMemberBalance,
  computeGlobalSettlements,
  computeFriendBalances,
} from "../balances";
import type { OutingMember, Transaction, SettlementRecord } from "@/types";

describe("balances logic", () => {
  const members: OutingMember[] = [
    { id: "m1", name: "Alice" },
    { id: "m2", name: "Bob" },
    { id: "m3", name: "Charlie" },
  ];

  describe("computeSplits", () => {
    it("splits equally among all members", () => {
      const splits = computeSplits(30, members, "equally");
      expect(splits).toHaveLength(3);
      expect(splits).toEqual(
        expect.arrayContaining([
          { memberId: "m1", amount: 10 },
          { memberId: "m2", amount: 10 },
          { memberId: "m3", amount: 10 },
        ])
      );
    });

    it("respects custom splits when provided", () => {
      const custom = [
        { memberId: "m1", amount: 20 },
        { memberId: "m2", amount: 5 },
        { memberId: "m3", amount: 5 },
      ];
      const splits = computeSplits(30, members, "exact", custom);
      expect(splits).toEqual(custom);
    });

    it("defaults to 0 for all if custom splits are missing in custom mode", () => {
      const splits = computeSplits(30, members, "exact");
      expect(splits).toEqual([
        { memberId: "m1", amount: 0 },
        { memberId: "m2", amount: 0 },
        { memberId: "m3", amount: 0 },
      ]);
    });
  });

  describe("computeMemberBalances", () => {
    it("computes balances correctly for a single transaction", () => {
      const txs: Transaction[] = [
        {
          id: "tx1",
          outingId: "o1",
          title: "Lunch",
          amount: 30,
          description: "Lunch",
          paidById: "m1",
          paidByName: "Alice",
          splitMode: "equally",
          splits: [
            { memberId: "m1", amount: 10 },
            { memberId: "m2", amount: 10 },
            { memberId: "m3", amount: 10 },
          ],
          date: Date.now().toString(),
          createdAt: Date.now().toString(),
          createdById: "m1",
          createdByName: "Alice",
        },
      ];

      const balances = computeMemberBalances(members, txs);
      expect(balances.find((b) => b.memberId === "m1")?.balance).toBe(20);
      expect(balances.find((b) => b.memberId === "m2")?.balance).toBe(-10);
      expect(balances.find((b) => b.memberId === "m3")?.balance).toBe(-10);
    });

    it("factors in settlement records", () => {
      const txs: Transaction[] = [
        {
          id: "tx1",
          outingId: "o1",
          title: "Lunch",
          amount: 30,
          description: "Lunch",
          paidById: "m1",
          paidByName: "Alice",
          splitMode: "equally",
          splits: [
            { memberId: "m1", amount: 10 },
            { memberId: "m2", amount: 10 },
            { memberId: "m3", amount: 10 },
          ],
          date: Date.now().toString(),
          createdAt: Date.now().toString(),
          createdById: "m1",
          createdByName: "Alice",
        },
      ];

      const settlements: SettlementRecord[] = [
        {
          id: "s1",
          outingId: "o1",
          fromId: "m2",
          fromName: "Bob",
          toId: "m1",
          toName: "Alice",
          amount: 5,
          type: "settle",
          createdAt: Date.now().toString(),
          recordedById: "m2",
          recordedByName: "Bob",
        },
      ];

      const balances = computeMemberBalances(members, txs, settlements);
      expect(balances.find((b) => b.memberId === "m1")?.balance).toBe(15);
      expect(balances.find((b) => b.memberId === "m2")?.balance).toBe(-5);
    });
  });

  describe("simplifyDebts", () => {
    it("simplifies a straightforward 1-to-1 debt", () => {
      // Bob owes Alice 10
      const balances = [
        { memberId: "m1", name: "Alice", balance: 10 },
        { memberId: "m2", name: "Bob", balance: -10 },
      ];
      const edges = simplifyDebts(balances);
      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({
        fromId: "m2",
        fromName: "Bob",
        toId: "m1",
        toName: "Alice",
        amount: 10,
      });
    });

    it("simplifies a debt circle (A owes B, B owes C, C owes A)", () => {
      // Net balances are 0 for everyone
      const balances = [
        { memberId: "m1", name: "Alice", balance: 0 },
        { memberId: "m2", name: "Bob", balance: 0 },
        { memberId: "m3", name: "Charlie", balance: 0 },
      ];
      const edges = simplifyDebts(balances);
      expect(edges).toHaveLength(0);
    });

    it("minimizes total transactions for complex debts", () => {
      // Alice owes 20 (-20)
      // Bob is owed 50 (+50)
      // Charlie owes 30 (-30)
      const balances = [
        { memberId: "m1", name: "Alice", balance: -20 },
        { memberId: "m2", name: "Bob", balance: 50 },
        { memberId: "m3", name: "Charlie", balance: -30 },
      ];
      const edges = simplifyDebts(balances);
      expect(edges).toHaveLength(2);
      
      const aliceToBob = edges.find((e) => e.fromId === "m1" && e.toId === "m2");
      const charlieToBob = edges.find((e) => e.fromId === "m3" && e.toId === "m2");
      
      expect(aliceToBob?.amount).toBe(20);
      expect(charlieToBob?.amount).toBe(30);
    });
  });

  describe("getOutingTotalSpent & getMemberBalance", () => {
    it("calculates total spent", () => {
      const txs: Transaction[] = [
        { id: "tx1", amount: 15 } as Transaction,
        { id: "tx2", amount: 25 } as Transaction,
      ];
      expect(getOutingTotalSpent(txs)).toBe(40);
    });

    it("gets member balance", () => {
      const txs: Transaction[] = [
        {
          id: "tx1",
          outingId: "o1",
          amount: 30,
          title: "Lunch",
          description: "Lunch",
          paidById: "m1",
          paidByName: "Alice",
          splitMode: "equally",
          splits: [
            { memberId: "m1", amount: 10 },
            { memberId: "m2", amount: 10 },
            { memberId: "m3", amount: 10 },
          ],
          date: Date.now().toString(),
          createdAt: Date.now().toString(),
          createdById: "m1",
          createdByName: "Alice",
        },
      ];
      
      expect(getMemberBalance("m1", members, txs)).toBe(20);
      expect(getMemberBalance("m2", members, txs)).toBe(-10);
    });
  });
});

describe("settled outings are excluded from live debts", () => {
  const members: OutingMember[] = [
    { id: "me", name: "Karthi" },
    { id: "f1", name: "Arun" },
  ];
  const outing = (id: string, status: "ongoing" | "planned" | "settled") => ({
    id,
    name: id,
    category: "Trip",
    date: "",
    status,
    members,
    createdAt: "2026-08-01T00:00:00.000Z",
    createdById: "me",
    createdByName: "Karthi",
  });
  const txs = [
    {
      id: "t1",
      outingId: "o1",
      title: "Hotel",
      amount: 200,
      paidById: "me",
      paidByName: "Karthi",
      splitMode: "equally",
      splits: [
        { memberId: "me", amount: 100 },
        { memberId: "f1", amount: 100 },
      ],
      date: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      createdById: "me",
      createdByName: "Karthi",
    },
  ] as Transaction[];

  it("computeGlobalSettlements skips settled outings", () => {
    expect(computeGlobalSettlements([outing("o1", "ongoing")], txs, "me")).toHaveLength(1);
    expect(computeGlobalSettlements([outing("o1", "settled")], txs, "me")).toHaveLength(0);
    // Planned outings can hold advance bookings, so they still count.
    expect(computeGlobalSettlements([outing("o1", "planned")], txs, "me")).toHaveLength(1);
  });

  it("computeFriendBalances skips settled outings", () => {
    const friends = [{ id: "f1", name: "Arun", email: "a@x.com" }];
    const open = computeFriendBalances(friends, [outing("o1", "ongoing")], txs, "me", "Karthi");
    const closed = computeFriendBalances(friends, [outing("o1", "settled")], txs, "me", "Karthi");
    expect(open.get("f1")).toBe(100);
    expect(closed.get("f1")).toBe(0);
  });
});
