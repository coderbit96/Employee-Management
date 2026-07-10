import { z } from "zod";

export const createLeaveMessageSchema = z
  .object({
    subject: z.string().trim().min(3).max(120),
    message: z.string().trim().min(10).max(2000),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

export type CreateLeaveMessageInput = z.infer<typeof createLeaveMessageSchema>;

