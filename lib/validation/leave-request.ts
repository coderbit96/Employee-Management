import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    leaveType: z.enum(["PAID", "UNPAID", "SICK", "CASUAL", "OTHER"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    halfDay: z.coerce.boolean().default(false),
    reason: z.string().trim().min(3).max(1500),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  })
  .refine(
    (value) =>
      !value.halfDay ||
      value.startDate.toDateString() === value.endDate.toDateString(),
    {
      message: "Half-day leave must start and end on the same date.",
      path: ["halfDay"],
    },
  );

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const listLeaveRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "CANCELLATION_PENDING", "CANCELLED"]).optional(),
  scope: z.enum(["mine", "inbox"]).default("mine"),
});

export type ListLeaveRequestsQuery = z.infer<
  typeof listLeaveRequestsQuerySchema
>;

export const withdrawLeaveSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
