import { describe, it, expect } from "vitest";
import {
  CATEGORY_PRESETS,
  OUTING_CATEGORIES,
  OUTING_CATEGORY_LABELS,
  TRANSACTION_CATEGORIES,
  getCategoryPreset,
} from "@/types";
import { getCategoryIcon } from "../identity";

describe("category presets", () => {
  it("covers every outing type", () => {
    for (const type of OUTING_CATEGORIES) {
      expect(CATEGORY_PRESETS[type].primary.length).toBeGreaterThan(0);
    }
  });

  it("keeps the primary list short enough to enter an expense quickly", () => {
    for (const type of OUTING_CATEGORIES) {
      expect(CATEGORY_PRESETS[type].primary.length).toBeLessThanOrEqual(8);
    }
  });

  it("never repeats a category between primary and more", () => {
    for (const type of OUTING_CATEGORIES) {
      const { primary, more } = CATEGORY_PRESETS[type];
      const overlap = primary.filter((c) => more.includes(c));
      expect(overlap).toEqual([]);
    }
  });

  it("always offers Other somewhere", () => {
    for (const type of OUTING_CATEGORIES) {
      const { primary, more } = CATEGORY_PRESETS[type];
      expect([...primary, ...more]).toContain("Other");
    }
  });

  it("spells shared concepts identically, so Reports can total them", () => {
    // A name that differs by type would show as separate slices forever.
    const all = OUTING_CATEGORIES.flatMap((t) => [
      ...CATEGORY_PRESETS[t].primary,
      ...CATEGORY_PRESETS[t].more,
    ]);
    for (const banned of [
      "Shopping / Souvenirs",
      "Beverages",
      "Medical / Emergency",
      "Tickets",
    ]) {
      expect(all).not.toContain(banned);
    }
    expect(all).toContain("Shopping");
    expect(all).toContain("Drinks");
    expect(all).toContain("Medical");
    expect(all).toContain("Entry Tickets");
  });

  it("falls back to the generic set for a custom outing type", () => {
    expect(getCategoryPreset("Wedding")).toBe(CATEGORY_PRESETS.Other);
  });

  it("labels Other as Casual Outing without changing the stored value", () => {
    expect(OUTING_CATEGORY_LABELS.Other).toBe("Casual Outing");
    expect(OUTING_CATEGORIES).toContain("Other");
  });

  it("gives every category a real icon, not the fallback", () => {
    const fallback = getCategoryIcon("__not_a_category__");
    const all = new Set<string>([
      ...TRANSACTION_CATEGORIES,
      ...OUTING_CATEGORIES,
      ...OUTING_CATEGORIES.flatMap((t) => [
        ...CATEGORY_PRESETS[t].primary,
        ...CATEGORY_PRESETS[t].more,
      ]),
    ]);

    const missing = [...all].filter((c) => getCategoryIcon(c) === fallback);
    expect(missing).toEqual([]);
  });

  it("falls back for anything unknown, including a user's own category", () => {
    expect(getCategoryIcon("Wedding Gifts")).toBe(getCategoryIcon("__other__"));
  });
});
