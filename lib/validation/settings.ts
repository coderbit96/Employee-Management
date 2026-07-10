import { z } from "zod";

export const updateSettingsSchema = z.object({
  timezone: z.string().trim().min(1).optional(),
  fullDayMinutes: z.coerce.number().int().min(0).optional(),
  annualPaidLeaveDays: z.coerce.number().min(0).optional(),
  holidayDates: z.array(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  attendanceCapture: z
    .object({
      requireLocation: z.coerce.boolean().optional(),
      requirePhoto: z.coerce.boolean().optional(),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
