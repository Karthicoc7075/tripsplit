import { describe, it, expect } from "vitest";
import { toLocalTimeInput, parseTimeInput, formatClockTime, toDisplayDate } from "../format";

describe("toLocalTimeInput", () => {
  it("pads to the HH:MM an <input type=\"time\"> expects", () => {
    expect(toLocalTimeInput(new Date(2026, 7, 24, 9, 5))).toBe("09:05");
    expect(toLocalTimeInput(new Date(2026, 7, 24, 21, 30))).toBe("21:30");
  });

  it("returns empty for an unparseable date", () => {
    expect(toLocalTimeInput(new Date("nonsense"))).toBe("");
  });
});

describe("parseTimeInput", () => {
  it("accepts a clock time", () => {
    expect(parseTimeInput("21:30")).toEqual({ hours: 21, minutes: 30 });
    expect(parseTimeInput("9:05")).toEqual({ hours: 9, minutes: 5 });
  });

  it("rejects blanks and out-of-range values", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput(undefined)).toBeNull();
    expect(parseTimeInput("24:00")).toBeNull();
    expect(parseTimeInput("12:60")).toBeNull();
    expect(parseTimeInput("evening")).toBeNull();
  });
});

describe("formatClockTime", () => {
  it("renders a 12-hour label", () => {
    expect(formatClockTime("21:30")).toMatch(/9:30/);
    expect(formatClockTime("09:05")).toMatch(/9:05/);
  });

  it("passes through anything that is not a clock time", () => {
    expect(formatClockTime("")).toBe("");
    expect(formatClockTime(undefined)).toBe("");
  });
});

describe("toDisplayDate", () => {
  it("turns the date input value into the stored display form", () => {
    expect(toDisplayDate("2026-08-24")).toBe("24 Aug 2026");
  });

  it("leaves an already-formatted date on the same day", () => {
    expect(toDisplayDate("24 Aug 2026")).toBe("24 Aug 2026");
  });
});
