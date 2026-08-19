import { describe, it, expect } from "vitest";
import { parseLocalDate, toLocalDateInput } from "../format";
import { deriveOutingStatus } from "../outing";

describe("local calendar dates", () => {
  it("formats a local day, not a UTC one", () => {
    // 20 Aug 2026, 23:00 local. toISOString() would report the 20th as the 21st
    // west of Greenwich and the 19th east of it, depending on offset.
    expect(toLocalDateInput(new Date(2026, 7, 20, 23, 0))).toBe("2026-08-20");
    expect(toLocalDateInput(new Date(2026, 7, 20, 0, 30))).toBe("2026-08-20");
    expect(toLocalDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through parseLocalDate at local midnight", () => {
    const d = parseLocalDate("2026-08-20")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(0);
    expect(toLocalDateInput(d)).toBe("2026-08-20");
  });

  it("returns null for missing or unparseable values", () => {
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate("Just created")).toBeNull();
  });

  it("still parses full timestamps", () => {
    expect(parseLocalDate("2026-08-20T10:00:00.000Z")).toBeInstanceOf(Date);
  });
});

describe("deriveOutingStatus around today", () => {
  const day = (offset: number) => {
    const n = new Date();
    return toLocalDateInput(new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset));
  };

  it("a trip starting tomorrow is planned, in any timezone", () => {
    expect(deriveOutingStatus(day(1))).toBe("planned");
    expect(deriveOutingStatus(day(1), day(3))).toBe("planned");
  });

  it("a trip starting today is ongoing", () => {
    expect(deriveOutingStatus(day(0))).toBe("ongoing");
    expect(deriveOutingStatus(day(0), day(2))).toBe("ongoing");
  });

  it("a trip that already started is ongoing", () => {
    expect(deriveOutingStatus(day(-2), day(2))).toBe("ongoing");
  });

  it("an outing with no dates is ongoing", () => {
    expect(deriveOutingStatus(undefined, undefined)).toBe("ongoing");
  });

  it("an explicit status always wins", () => {
    expect(deriveOutingStatus(day(1), day(3), "settled")).toBe("settled");
  });
});
