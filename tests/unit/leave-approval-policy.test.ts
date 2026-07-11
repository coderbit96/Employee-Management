import { describe, expect, it } from "vitest";
import {
  canReceiveLeaveRequest,
  canRequestLeave,
  getLeaveApprovalRoute,
} from "@/lib/leave/approval-policy";

describe("leave approval policy", () => {
  it("routes Employee and Manager leave requests to HR", () => {
    expect(getLeaveApprovalRoute("EMPLOYEE")).toEqual(["HR"]);
    expect(getLeaveApprovalRoute("MANAGER")).toEqual(["HR"]);
    expect(canReceiveLeaveRequest("HR", "EMPLOYEE")).toBe(true);
    expect(canReceiveLeaveRequest("ADMIN", "EMPLOYEE")).toBe(false);
    expect(canReceiveLeaveRequest("SUPER_ADMIN", "MANAGER")).toBe(false);
  });

  it("routes HR leave requests to Admin dashboards", () => {
    expect(getLeaveApprovalRoute("HR")).toEqual(["ADMIN", "SUPER_ADMIN"]);
    expect(canReceiveLeaveRequest("ADMIN", "HR")).toBe(true);
    expect(canReceiveLeaveRequest("SUPER_ADMIN", "HR")).toBe(true);
    expect(canReceiveLeaveRequest("HR", "HR")).toBe(false);
  });

  it("allows only Employee, Manager, and HR accounts to request leave", () => {
    expect(canRequestLeave("EMPLOYEE")).toBe(true);
    expect(canRequestLeave("MANAGER")).toBe(true);
    expect(canRequestLeave("HR")).toBe(true);
    expect(canRequestLeave("ADMIN")).toBe(false);
    expect(canRequestLeave("SUPER_ADMIN")).toBe(false);
  });
});
