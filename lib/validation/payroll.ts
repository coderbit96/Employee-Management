import { z } from "zod";

export const createSalaryPaymentSchema = z
  .object({
    employeeId: z.string().trim().min(1).optional(),
    employeeIds: z.array(z.string().trim().min(1)).optional(),
    payPeriod: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pay period must be YYYY-MM."),
    deductions: z.coerce.number().min(0).default(0),
    bonuses: z.coerce.number().min(0).default(0),
    paymentMethod: z.string().trim().max(80).optional(),
  })
  .refine((value) => value.deductions >= 0 && value.bonuses >= 0)
  .refine((value) => Boolean(value.employeeId || value.employeeIds?.length), {
    message: "Select at least one employee.",
    path: ["employeeId"],
  });

export type CreateSalaryPaymentInput = z.infer<
  typeof createSalaryPaymentSchema
>;

export const listSalaryPaymentsQuerySchema = z.object({
  employeeId: z.string().trim().optional(),
  payPeriod: z.string().trim().optional(),
  status: z
    .enum(["DRAFT", "PROCESSING", "PAID", "FAILED", "REVERSED"])
    .optional(),
});

export type ListSalaryPaymentsQuery = z.infer<
  typeof listSalaryPaymentsQuerySchema
>;

export const markPaidSchema = z.object({
  paymentMethod: z.string().trim().max(80).optional(),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;

export const reversePaymentSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export const updateSalaryPaymentSchema = z.object({
  status: z.enum(["DRAFT", "PROCESSING", "FAILED"]),
  deductions: z.coerce.number().min(0).optional(),
  bonuses: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().trim().max(80).optional(),
});
export type UpdateSalaryPaymentInput = z.infer<typeof updateSalaryPaymentSchema>;
