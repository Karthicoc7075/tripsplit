import { describe, it, expect } from "vitest";
import { canUserEditTransaction, canUserDeleteTransaction } from "../permissions";
import type { Outing, Transaction } from "@/types";

const OWNER = "owner";
const MEMBER = "member";
const OTHER = "other";
const STRANGER = "stranger";

const outing: Outing = {
  id: "o1",
  name: "Goa Trip",
  category: "Trip",
  date: "",
  status: "ongoing",
  members: [
    { id: OWNER, name: "Karthi" },
    { id: MEMBER, name: "Arun" },
    { id: OTHER, name: "Priya" },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  createdById: OWNER,
  createdByName: "Karthi",
};

/** Logged by MEMBER. */
const tx: Transaction = {
  id: "t1",
  outingId: "o1",
  title: "Hotel",
  amount: 900,
  paidById: MEMBER,
  paidByName: "Arun",
  splitMode: "equally",
  splits: [{ memberId: MEMBER, amount: 900 }],
  date: "5 Aug 2026",
  createdAt: "2026-08-05T00:00:00.000Z",
  createdById: MEMBER,
  createdByName: "Arun",
};

describe("editing — any member", () => {
  it("the author can edit", () => {
    expect(canUserEditTransaction(tx, MEMBER, outing)).toBe(true);
  });

  it("another member can edit someone else's expense", () => {
    expect(canUserEditTransaction(tx, OTHER, outing)).toBe(true);
  });

  it("the outing owner can edit", () => {
    expect(canUserEditTransaction(tx, OWNER, outing)).toBe(true);
  });

  it("a non-member cannot edit", () => {
    expect(canUserEditTransaction(tx, STRANGER, outing)).toBe(false);
  });
});

describe("deleting — author or outing owner only", () => {
  it("the author can delete their own", () => {
    expect(canUserDeleteTransaction(tx, MEMBER, outing)).toBe(true);
  });

  it("the outing owner can delete anyone's", () => {
    expect(canUserDeleteTransaction(tx, OWNER, outing)).toBe(true);
  });

  it("another member cannot delete someone else's", () => {
    expect(canUserDeleteTransaction(tx, OTHER, outing)).toBe(false);
  });

  it("a non-member cannot delete", () => {
    expect(canUserDeleteTransaction(tx, STRANGER, outing)).toBe(false);
  });

  it("falls back to the first member when the outing has no recorded creator", () => {
    const legacy = { ...outing, createdById: undefined };
    // getOutingCreatorId() treats the first member as the owner.
    expect(canUserDeleteTransaction(tx, OWNER, legacy)).toBe(true);
    expect(canUserDeleteTransaction(tx, OTHER, legacy)).toBe(false);
  });

  it("an expense with no recorded author is still deletable by the owner", () => {
    const legacyTx = { ...tx, createdById: undefined as unknown as string };
    expect(canUserDeleteTransaction(legacyTx, OWNER, outing)).toBe(true);
    expect(canUserDeleteTransaction(legacyTx, OTHER, outing)).toBe(false);
  });
});
