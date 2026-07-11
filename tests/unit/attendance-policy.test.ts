import { describe, expect, it } from "vitest";
import {
  canUseDailyAttendance,
  isWorkingDay,
} from "@/lib/attendance/policy";

describe("daily attendance policy", () => {
  it("allows only Employee, HR, and Manager roles", () => {
    expect(canUseDailyAttendance("EMPLOYEE")).toBe(true);
    expect(canUseDailyAttendance("HR")).toBe(true);
    expect(canUseDailyAttendance("MANAGER")).toBe(true);
    expect(canUseDailyAttendance("ADMIN")).toBe(false);
    expect(canUseDailyAttendance("SUPER_ADMIN")).toBe(false);
  });

  it("allows Monday to Saturday and blocks Sundays and configured holidays", () => {
    expect(isWorkingDay("2026-07-13", [])).toBe(true);
    expect(isWorkingDay("2026-07-11", [])).toBe(true);
    expect(isWorkingDay("2026-07-12", [])).toBe(false);
    expect(isWorkingDay("2026-07-13", ["2026-07-13"])).toBe(false);
    expect(isWorkingDay("2026-07-11", ["2026-07-11"])).toBe(false);
  });
});
