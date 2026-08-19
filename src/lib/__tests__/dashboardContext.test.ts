import { describe, it, expect } from "vitest";
import { getDashboardContext, isPrematurelySettled } from "../dashboardContext";
import type { Outing, Transaction } from "@/types";

const ME = "me";
const NOW = new Date(2026, 7, 19); // 19 Aug 2026

const outing = (over: Partial<Outing> = {}): Outing => ({
  id: "o1",
  name: "Goa Trip",
  category: "Trip",
  date: "",
  status: "ongoing",
  members: [
    { id: ME, name: "Karthi" },
    { id: "f1", name: "Arun" },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  outingId: "o1",
  title: "Hotel",
  amount: 1000,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [{ memberId: ME, amount: 1000 }],
  date: "17 Aug 2026",
  createdAt: "2026-08-17T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
  ...over,
});

describe("getDashboardContext", () => {
  it("is home mode with nothing going on", () => {
    expect(getDashboardContext([], [], NOW)).toEqual({ mode: "home" });
    expect(getDashboardContext([outing({ status: "settled" })], [], NOW).mode).toBe("home");
  });

  it("prefers an ongoing outing over a planned one", () => {
    const ctx = getDashboardContext(
      [outing({ id: "p", status: "planned", startDate: "2026-09-01" }), outing()],
      [],
      NOW
    );
    expect(ctx.mode).toBe("active");
    if (ctx.mode === "active") expect(ctx.outing.id).toBe("o1");
  });

  it("picks the ongoing outing finishing soonest", () => {
    const ctx = getDashboardContext(
      [
        outing({ id: "late", startDate: "2026-08-01", endDate: "2026-08-30" }),
        outing({ id: "soon", startDate: "2026-08-17", endDate: "2026-08-21" }),
      ],
      [],
      NOW
    );
    if (ctx.mode === "active") expect(ctx.outing.id).toBe("soon");
  });

  it("counts trip days and budget burn", () => {
    const ctx = getDashboardContext(
      [outing({ startDate: "2026-08-17", endDate: "2026-08-21", budget: 5000 })],
      [tx({ amount: 3000 })],
      NOW
    );
    expect(ctx.mode).toBe("active");
    if (ctx.mode !== "active") return;

    expect(ctx.dayIndex).toBe(3); // 17th, 18th, 19th
    expect(ctx.totalDays).toBe(5);
    expect(ctx.daysLeft).toBe(2);
    expect(ctx.totalSpent).toBe(3000);
    expect(ctx.budgetLeft).toBe(2000);
    expect(ctx.usedPct).toBe(60);
    expect(ctx.burnPerDay).toBe(1000);
    expect(ctx.projectedTotal).toBe(5000);
    expect(ctx.projectedOverBy).toBeUndefined(); // lands exactly on budget
  });

  it("warns when the burn rate overshoots the budget", () => {
    const ctx = getDashboardContext(
      [outing({ startDate: "2026-08-17", endDate: "2026-08-21", budget: 4000 })],
      [tx({ amount: 3000 })],
      NOW
    );
    if (ctx.mode !== "active") throw new Error("expected active");
    expect(ctx.projectedTotal).toBe(5000);
    expect(ctx.projectedOverBy).toBe(1000);
  });

  it("counts only today's expenses as spent today", () => {
    const ctx = getDashboardContext(
      [outing({ startDate: "2026-08-17" })],
      [tx({ amount: 1000 }), tx({ id: "t2", amount: 250, date: "19 Aug 2026" })],
      NOW
    );
    if (ctx.mode !== "active") throw new Error("expected active");
    expect(ctx.totalSpent).toBe(1250);
    expect(ctx.spentToday).toBe(250);
  });

  it("handles an ongoing outing with no dates or budget", () => {
    const ctx = getDashboardContext([outing()], [tx()], NOW);
    if (ctx.mode !== "active") throw new Error("expected active");
    expect(ctx.dayIndex).toBeUndefined();
    expect(ctx.budget).toBeUndefined();
    expect(ctx.usedPct).toBeUndefined();
    expect(ctx.totalSpent).toBe(1000);
  });

  it("falls back to planning mode and counts down to the start", () => {
    const ctx = getDashboardContext(
      [outing({ status: "planned", startDate: "2026-08-31", budget: 20000 })],
      [tx({ amount: 8000 })],
      NOW
    );
    expect(ctx.mode).toBe("planning");
    if (ctx.mode !== "planning") return;

    expect(ctx.startsInDays).toBe(12);
    expect(ctx.booked).toBe(8000); // advance bookings already paid
    expect(ctx.memberCount).toBe(2);
    expect(ctx.perHead).toBe(10000);
  });

  it("picks the planned outing starting soonest", () => {
    const ctx = getDashboardContext(
      [
        outing({ id: "far", status: "planned", startDate: "2026-12-01" }),
        outing({ id: "near", status: "planned", startDate: "2026-09-01" }),
      ],
      [],
      NOW
    );
    if (ctx.mode === "planning") expect(ctx.outing.id).toBe("near");
  });

  it("never counts down past zero", () => {
    const ctx = getDashboardContext(
      [outing({ status: "planned", startDate: "2026-08-01" })],
      [],
      NOW
    );
    if (ctx.mode !== "planning") throw new Error("expected planning");
    expect(ctx.startsInDays).toBe(0);
  });
});

describe("home mode", () => {
  it("reports the last finished outing", () => {
    const ctx = getDashboardContext(
      [outing({ status: "settled", startDate: "2026-08-10", endDate: "2026-08-14" })],
      [],
      NOW
    );
    if (ctx.mode !== "home") throw new Error("expected home");
    expect(ctx.lastOuting?.outing.id).toBe("o1");
    expect(ctx.lastOuting?.daysAgo).toBe(5);
    expect(ctx.settledButUpcoming).toBeUndefined();
  });

  it("flags a settled outing whose trip is still ahead", () => {
    const ctx = getDashboardContext(
      [outing({ status: "settled", startDate: "2026-08-20", endDate: "2026-08-22" })],
      [],
      NOW
    );
    if (ctx.mode !== "home") throw new Error("expected home");
    expect(ctx.settledButUpcoming?.outing.id).toBe("o1");
    expect(ctx.settledButUpcoming?.startsInDays).toBe(1);
  });

  it("does not flag an outing settled after it ended", () => {
    expect(
      isPrematurelySettled(
        outing({ status: "settled", startDate: "2026-08-01", endDate: "2026-08-05" }),
        NOW
      )
    ).toBe(false);
  });

  it("does not flag outings that are not settled", () => {
    expect(isPrematurelySettled(outing({ startDate: "2026-08-20" }), NOW)).toBe(false);
  });
});

describe("planning extras", () => {
  it("marks a trip within a week as urgent", () => {
    const soon = getDashboardContext(
      [outing({ status: "planned", startDate: "2026-08-22" })],
      [],
      NOW
    );
    const later = getDashboardContext(
      [outing({ status: "planned", startDate: "2026-10-01" })],
      [],
      NOW
    );
    if (soon.mode !== "planning" || later.mode !== "planning") throw new Error("expected planning");
    expect(soon.isUrgent).toBe(true);
    expect(later.isUrgent).toBe(false);
  });

  it("builds a checklist of what is still missing", () => {
    const bare = getDashboardContext(
      [
        outing({
          status: "planned",
          startDate: "2026-08-25",
          endDate: undefined,
          budget: undefined,
          members: [{ id: ME, name: "Karthi" }],
        }),
      ],
      [],
      NOW
    );
    if (bare.mode !== "planning") throw new Error("expected planning");
    expect(bare.checklist.every((c) => !c.done)).toBe(true);

    const ready = getDashboardContext(
      [outing({ status: "planned", startDate: "2026-08-25", endDate: "2026-08-28", budget: 5000 })],
      [],
      NOW
    );
    if (ready.mode !== "planning") throw new Error("expected planning");
    expect(ready.checklist.every((c) => c.done)).toBe(true);
  });
});

describe("pinning", () => {
  it("a pinned ongoing outing leads over a nearer end date", () => {
    const ctx = getDashboardContext(
      [
        outing({ id: "soon", startDate: "2026-08-17", endDate: "2026-08-20" }),
        outing({ id: "pinned", startDate: "2026-08-01", endDate: "2026-08-30", pinned: true }),
      ],
      [],
      NOW
    );
    if (ctx.mode !== "active") throw new Error("expected active");
    expect(ctx.outing.id).toBe("pinned");
  });

  it("a pinned planned outing leads over a nearer start date", () => {
    const ctx = getDashboardContext(
      [
        outing({ id: "near", status: "planned", startDate: "2026-08-21" }),
        outing({ id: "pinned", status: "planned", startDate: "2026-12-01", pinned: true }),
      ],
      [],
      NOW
    );
    if (ctx.mode !== "planning") throw new Error("expected planning");
    expect(ctx.outing.id).toBe("pinned");
  });
});
