import { describe, it, expect } from "vitest";
import { getRecentActivity } from "../dashboard";
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

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  outingId: "o1",
  title: "Hotel",
  amount: 900,
  paidById: ME,
  paidByName: "Karthi",
  splitMode: "equally",
  splits: [{ memberId: ME, amount: 900 }],
  date: "5 Aug 2026",
  createdAt: "2026-08-05T10:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi",
  ...over,
});

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

describe("getRecentActivity with settlements", () => {
  it("includes settlements, tagged as settled", () => {
    const items = getRecentActivity([tx()], [outing], ME, "Karthi", 5, [settle()]);
    expect(items).toHaveLength(2);

    const settled = items.find((i) => i.type === "settled");
    expect(settled?.text).toBe("Arun paid you ₹300 in Goa Trip");
  });

  it("words a settlement you made from your side", () => {
    const items = getRecentActivity([], [outing], ME, "Karthi", 5, [
      settle({ fromId: ME, fromName: "Karthi", toId: "f1", toName: "Arun Kumar" }),
    ]);
    expect(items[0].text).toBe("You paid Arun ₹300 in Goa Trip");
  });

  it("words a settlement between two other people neutrally", () => {
    const items = getRecentActivity([], [outing], ME, "Karthi", 5, [
      settle({ fromId: "f1", fromName: "Arun Kumar", toId: "f2", toName: "Priya S" }),
    ]);
    expect(items[0].text).toBe("Arun paid Priya ₹300 in Goa Trip");
  });

  it("orders expenses and settlements together, newest first", () => {
    const items = getRecentActivity(
      [tx({ id: "old", createdAt: "2026-08-01T00:00:00.000Z" })],
      [outing],
      ME,
      "Karthi",
      5,
      [settle({ id: "new", createdAt: "2026-08-09T00:00:00.000Z" })]
    );
    expect(items.map((i) => i.id)).toEqual(["new", "old"]);
  });

  it("respects the limit across both kinds", () => {
    const txs = Array.from({ length: 4 }, (_, i) =>
      tx({ id: `t${i}`, createdAt: `2026-08-0${i + 1}T00:00:00.000Z` })
    );
    const records = Array.from({ length: 4 }, (_, i) =>
      settle({ id: `s${i}`, createdAt: `2026-08-1${i}T00:00:00.000Z` })
    );
    expect(getRecentActivity(txs, [outing], ME, "Karthi", 3, records)).toHaveLength(3);
  });

  it("ignores settlements for outings the user cannot see", () => {
    const items = getRecentActivity([], [outing], ME, "Karthi", 5, [
      settle({ outingId: "gone" }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("still works with no settlements passed", () => {
    const items = getRecentActivity([tx()], [outing], ME, "Karthi");
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("paid");
  });

  it("does not leak the internal sort key", () => {
    const items = getRecentActivity([tx()], [outing], ME, "Karthi", 5, [settle()]);
    for (const item of items) {
      expect(item).not.toHaveProperty("at");
    }
  });
});
