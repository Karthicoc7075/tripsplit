import { describe, it, expect } from "vitest";
import { computeDashboardStats } from "../balances";
import type { Outing, Transaction } from "@/types";

const ME = "me";

const outing = (id: string, status: Outing["status"]): Outing => ({
  id,
  name: id,
  category: "Trip",
  date: "",
  status,
  members: [
    { id: ME, name: "Karthi" },
    { id: "f1", name: "Arun" },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
});

/** I pay 1000, split 500/500 — so I am owed 500. */
const paidByMe = (outingId: string): Transaction => ({
  id: `tx-${outingId}`,
  outingId,
  title: "Advance booking",
  amount: 1000,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [
    { memberId: ME, amount: 500 },
    { memberId: "f1", amount: 500 },
  ],
  date: "1 Aug 2026",
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
});

describe("computeDashboardStats — outing status handling", () => {
  it("counts a planned outing's advance expenses", () => {
    const stats = computeDashboardStats([outing("o1", "planned")], [paidByMe("o1")], ME);
    expect(stats.youAreOwed).toBe(500);
    expect(stats.totalBalance).toBe(500);
  });

  it("counts an ongoing outing", () => {
    const stats = computeDashboardStats([outing("o1", "ongoing")], [paidByMe("o1")], ME);
    expect(stats.totalBalance).toBe(500);
  });

  it("keeps a settled outing that is still owed — closing it moved no money", () => {
    const stats = computeDashboardStats([outing("o1", "settled")], [paidByMe("o1")], ME);
    expect(stats.totalBalance).toBe(500);
    expect(stats.youAreOwed).toBe(500);
  });

  it("excludes a settled outing once it has been paid back", () => {
    const stats = computeDashboardStats([outing("o1", "settled")], [paidByMe("o1")], ME, [
      {
        id: "s1",
        outingId: "o1",
        fromId: "f1",
        fromName: "Arun",
        toId: ME,
        toName: "Karthi",
        amount: 500,
        type: "return",
        createdAt: "2026-08-02T00:00:00.000Z",
        recordedById: ME,
        recordedByName: "Karthi",
      },
    ]);
    expect(stats.totalBalance).toBe(0);
    expect(stats.youAreOwed).toBe(0);
  });

  it("sums every outing still carrying money, whatever its status", () => {
    const stats = computeDashboardStats(
      [outing("o1", "ongoing"), outing("o2", "planned"), outing("o3", "settled")],
      [paidByMe("o1"), paidByMe("o2"), paidByMe("o3")],
      ME
    );
    expect(stats.totalBalance).toBe(1500);
  });

  it("activeOutings stays ongoing-only — the card says 'Currently ongoing'", () => {
    const stats = computeDashboardStats(
      [outing("o1", "ongoing"), outing("o2", "planned"), outing("o3", "settled")],
      [],
      ME
    );
    expect(stats.activeOutings).toBe(1);
  });

  it("a planned outing with no expenses contributes nothing", () => {
    const stats = computeDashboardStats([outing("o1", "planned")], [], ME);
    expect(stats).toMatchObject({ totalBalance: 0, youOwe: 0, youAreOwed: 0, oweCount: 0, owedCount: 0 });
  });

  it("tracks who you owe on a planned outing", () => {
    const tx: Transaction = { ...paidByMe("o1"), paidById: "f1", paidByName: "Arun" };
    const stats = computeDashboardStats([outing("o1", "planned")], [tx], ME);
    expect(stats.youOwe).toBe(500);
    expect(stats.oweCount).toBe(1);
  });
});
