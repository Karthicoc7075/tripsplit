import { describe, it, expect } from "vitest";
import { compareTransactionsByDateDesc, getTransactionInstant } from "../dashboard";
import type { Transaction } from "@/types";

const ME = "me";

const tx = (id: string, date: string, createdAt: string, time?: string): Transaction => ({
  id,
  outingId: "o1",
  title: id,
  amount: 100,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [{ memberId: ME, amount: 100 }],
  date,
  time,
  createdAt,
  createdById: ME,
  createdByName: "Karthi",
});

const ids = (list: Transaction[]) => list.slice().sort(compareTransactionsByDateDesc).map((t) => t.id);

describe("compareTransactionsByDateDesc", () => {
  it("orders by the day the money was spent, not when it was typed in", () => {
    // A yesterday-dated expense logged today must not jump above today's spends.
    const backdated = tx("yesterday-logged-today", "2026-08-23", "2026-08-24T18:00:00.000Z");
    const todayMorning = tx("today-morning", "2026-08-24", "2026-08-24T04:00:00.000Z");
    const todayNoon = tx("today-noon", "2026-08-24", "2026-08-24T07:00:00.000Z");

    expect(ids([backdated, todayMorning, todayNoon])).toEqual([
      "today-noon",
      "today-morning",
      "yesterday-logged-today",
    ]);
  });

  it("keeps same-day rows newest-entered first", () => {
    const first = tx("first", "2026-08-24", "2026-08-24T02:00:00.000Z");
    const second = tx("second", "2026-08-24", "2026-08-24T09:00:00.000Z");
    expect(ids([first, second])).toEqual(["second", "first"]);
  });

  it("falls back to createdAt when the expense date is missing", () => {
    const older = tx("older", "", "2026-08-20T09:00:00.000Z");
    const newer = tx("newer", "", "2026-08-22T09:00:00.000Z");
    expect(ids([older, newer])).toEqual(["newer", "older"]);
  });
});

describe("getTransactionInstant", () => {
  it("uses the time the user set on a back-dated expense", () => {
    const d = getTransactionInstant(tx("dinner", "2026-08-22", "2026-08-24T18:00:00.000Z", "21:30"));
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(21);
    expect(d.getMinutes()).toBe(30);
  });

  it("ignores createdAt's clock on a back-dated expense with no time", () => {
    const d = getTransactionInstant(tx("cab", "2026-08-22", "2026-08-24T18:00:00.000Z"));
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("falls back to createdAt's clock when the entry lands on the spend day", () => {
    const created = new Date(2026, 7, 24, 14, 5);
    const d = getTransactionInstant(tx("lunch", "2026-08-24", created.toISOString()));
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(5);
  });
});

describe("ordering with explicit times", () => {
  it("orders a back-dated day by the times the user typed, not entry order", () => {
    // Last night's spends, all logged this morning in whatever order.
    const breakfast = tx("breakfast", "2026-08-23", "2026-08-24T05:00:00.000Z", "08:15");
    const dinner = tx("dinner", "2026-08-23", "2026-08-24T05:01:00.000Z", "21:30");
    const cab = tx("cab", "2026-08-23", "2026-08-24T05:02:00.000Z", "18:45");

    expect(ids([breakfast, dinner, cab])).toEqual(["dinner", "cab", "breakfast"]);
  });

  it("still keeps an older day below today", () => {
    const lastNight = tx("last-night", "2026-08-23", "2026-08-24T05:00:00.000Z", "23:50");
    const thisMorning = tx("this-morning", "2026-08-24", "2026-08-24T06:00:00.000Z", "07:10");
    expect(ids([lastNight, thisMorning])).toEqual(["this-morning", "last-night"]);
  });
});
