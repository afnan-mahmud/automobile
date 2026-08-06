import { describe, it, expect } from "vitest";
import {
  dayKey,
  startOfDayUtc,
  endOfDayUtc,
  resolvePreset,
  parseDateRange,
  eachDayInRange,
  formatRangeLabel,
} from "@/lib/dateRange";

// Asia/Dhaka is UTC+6 with no daylight saving, so local midnight on day D
// is D-1T18:00:00Z and the last instant of day D is DT17:59:59.999Z.

describe("dayKey", () => {
  it("uses the Dhaka calendar day, not the UTC day", () => {
    // 20:30Z on Aug 6 is already 02:30 on Aug 7 in Dhaka
    expect(dayKey(new Date("2026-08-06T20:30:00.000Z"))).toBe("2026-08-07");
    // 17:59Z on Aug 6 is still Aug 6 in Dhaka (23:59)
    expect(dayKey(new Date("2026-08-06T17:59:00.000Z"))).toBe("2026-08-06");
  });
});

describe("day boundaries", () => {
  it("startOfDayUtc is Dhaka midnight expressed in UTC", () => {
    expect(startOfDayUtc("2026-08-06").toISOString()).toBe("2026-08-05T18:00:00.000Z");
  });

  it("endOfDayUtc includes the whole final day", () => {
    expect(endOfDayUtc("2026-08-06").toISOString()).toBe("2026-08-06T17:59:59.999Z");
  });
});

describe("resolvePreset", () => {
  const now = new Date("2026-08-06T09:00:00.000Z"); // 15:00 Dhaka, Aug 6

  it("today is a single day", () => {
    expect(resolvePreset("today", now)).toEqual({
      fromDay: "2026-08-06",
      toDay: "2026-08-06",
    });
  });

  it("last7 spans 7 days including today", () => {
    expect(resolvePreset("last7", now)).toEqual({
      fromDay: "2026-07-31",
      toDay: "2026-08-06",
    });
  });

  it("last30 spans 30 days including today", () => {
    expect(resolvePreset("last30", now)).toEqual({
      fromDay: "2026-07-08",
      toDay: "2026-08-06",
    });
  });

  it("thisMonth runs from the 1st to today", () => {
    expect(resolvePreset("thisMonth", now)).toEqual({
      fromDay: "2026-08-01",
      toDay: "2026-08-06",
    });
  });

  it("lastMonth covers the whole previous month", () => {
    expect(resolvePreset("lastMonth", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("thisYear runs from Jan 1 to today", () => {
    expect(resolvePreset("thisYear", now)).toEqual({
      fromDay: "2026-01-01",
      toDay: "2026-08-06",
    });
  });
});

describe("parseDateRange", () => {
  const now = new Date("2026-08-06T09:00:00.000Z");

  it("defaults to the last 30 days when nothing is supplied", () => {
    expect(parseDateRange(undefined, undefined, now)).toEqual(resolvePreset("last30", now));
  });

  it("accepts valid YYYY-MM-DD strings", () => {
    expect(parseDateRange("2026-07-01", "2026-07-31", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("falls back to the default when a value is unparseable", () => {
    expect(parseDateRange("garbage", "2026-07-31", now)).toEqual(resolvePreset("last30", now));
    expect(parseDateRange("2026-13-45", "2026-07-31", now)).toEqual(resolvePreset("last30", now));
  });

  it("falls back to the default when only one bound is supplied", () => {
    expect(parseDateRange("2026-07-01", undefined, now)).toEqual(resolvePreset("last30", now));
  });

  it("swaps the bounds when they arrive reversed", () => {
    expect(parseDateRange("2026-07-31", "2026-07-01", now)).toEqual({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
  });

  it("ignores array values from repeated query params", () => {
    expect(parseDateRange(["2026-07-01"], "2026-07-31", now)).toEqual(
      resolvePreset("last30", now)
    );
  });
});

describe("eachDayInRange", () => {
  it("returns every day inclusive of both bounds", () => {
    expect(eachDayInRange({ fromDay: "2026-08-04", toDay: "2026-08-07" })).toEqual([
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("returns a single day when both bounds match", () => {
    expect(eachDayInRange({ fromDay: "2026-08-06", toDay: "2026-08-06" })).toEqual([
      "2026-08-06",
    ]);
  });

  it("crosses month boundaries", () => {
    expect(eachDayInRange({ fromDay: "2026-07-30", toDay: "2026-08-02" })).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});

describe("formatRangeLabel", () => {
  it("shows both ends of a multi-day range", () => {
    expect(formatRangeLabel({ fromDay: "2026-07-01", toDay: "2026-07-31" })).toBe(
      "1 Jul 2026 — 31 Jul 2026"
    );
  });

  it("collapses a single-day range", () => {
    expect(formatRangeLabel({ fromDay: "2026-08-06", toDay: "2026-08-06" })).toBe("6 Aug 2026");
  });
});
