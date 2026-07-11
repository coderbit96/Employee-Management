import { describe, expect, it } from "vitest";
import { normalizeHolidayDate } from "@/lib/dates/holiday-date";

describe("holiday date normalization", () => {
  it("accepts named months without a year", () => {
    expect(normalizeHolidayDate("12 january", 2026)).toBe("2026-01-12");
    expect(normalizeHolidayDate("15 August", 2026)).toBe("2026-08-15");
  });

  it("accepts ISO, named-year, and day-first numeric dates", () => {
    expect(normalizeHolidayDate("2026-01-23", 2025)).toBe("2026-01-23");
    expect(normalizeHolidayDate("26 January 2027", 2026)).toBe("2027-01-26");
    expect(normalizeHolidayDate("15/08/2026", 2025)).toBe("2026-08-15");
  });

  it("rejects impossible or unknown dates", () => {
    expect(normalizeHolidayDate("31 February", 2026)).toBeNull();
    expect(normalizeHolidayDate("next holiday", 2026)).toBeNull();
  });
});
