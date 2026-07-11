import { describe, expect, it } from "vitest";
import { createLeaveRequestSchema } from "@/lib/validation/leave-request";

describe("leave request validation", () => {
  it("accepts short practical leave reasons", () => {
    const parsed = createLeaveRequestSchema.safeParse({
      leaveType: "SICK",
      startDate: "2026-10-26",
      endDate: "2026-10-26",
      halfDay: true,
      reason: "Medical",
    });

    expect(parsed.success).toBe(true);
  });

  it("requires half-day leave to use the same start and end date", () => {
    const parsed = createLeaveRequestSchema.safeParse({
      leaveType: "PAID",
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      halfDay: true,
      reason: "Medical",
    });

    expect(parsed.success).toBe(false);
  });
});
