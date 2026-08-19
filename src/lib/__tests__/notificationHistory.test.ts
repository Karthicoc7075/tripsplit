import { describe, it, expect } from "vitest";
import { buildNotificationHistory } from "../notificationHistory";
import type { Outing, SettlementRecord, Transaction } from "@/types";

const ME = "me";

const outing: Outing = {
  id: "o1",
  name: "Goa Trip",
  category: "Trip",
  date: "",
  status: "ongoing",
  members: [
    { id: ME, name: "Karthi" },
    { id: "f1", name: "Arun Kumar" },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
};

const settle = (over: Partial<SettlementRecord> = {}): SettlementRecord => ({
  id: "s1",
  outingId: "o1",
  fromId: "f1",
  fromName: "Arun Kumar",
  toId: ME,
  toName: "Karthi",
  amount: 300,
  type: "settle",
  createdAt: "2026-08-06T10:00:00.000Z",
  recordedById: "f1",
  recordedByName: "Arun Kumar",
  ...over,
});

const noTx: Transaction[] = [];

describe("settlement notifications", () => {
  it("tells you when a friend paid you back", () => {
    const items = buildNotificationHistory(noTx, [outing], [], ME, "Karthi", 20, [settle()]);
    const n = items.find((i) => i.id === "settlement-s1");
    expect(n?.title).toBe("You were paid back");
    expect(n?.message).toBe("Arun paid you ₹300 in Goa Trip");
    expect(n?.path).toBe("/outings/o1");
  });

  it("records a payment you made", () => {
    const items = buildNotificationHistory(noTx, [outing], [], ME, "Karthi", 20, [
      settle({ fromId: ME, fromName: "Karthi", toId: "f1", toName: "Arun Kumar" }),
    ]);
    expect(items[0].title).toBe("Payment recorded");
    expect(items[0].message).toBe("You paid Arun ₹300 in Goa Trip");
  });

  it("ignores settlements between other people", () => {
    const items = buildNotificationHistory(noTx, [outing], [], ME, "Karthi", 20, [
      settle({ fromId: "f1", toId: "f2", toName: "Priya" }),
    ]);
    expect(items.filter((i) => i.id.startsWith("settlement-"))).toEqual([]);
  });

  it("ignores settlements for outings you cannot see", () => {
    const items = buildNotificationHistory(noTx, [outing], [], ME, "Karthi", 20, [
      settle({ outingId: "gone" }),
    ]);
    expect(items.filter((i) => i.id.startsWith("settlement-"))).toEqual([]);
  });

  it("still works when no settlements are passed", () => {
    expect(() => buildNotificationHistory(noTx, [outing], [], ME, "Karthi")).not.toThrow();
  });
});
