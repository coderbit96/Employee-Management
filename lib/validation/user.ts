import { z } from "zod";
import { PERMISSIONS, ROLES } from "@/types/domain";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

export const createUserSchema = z.object({
  email: optionalTrimmedString.pipe(z.string().toLowerCase().email().optional()),
  loginId: optionalTrimmedString.pipe(
    z.string().toLowerCase().min(3).max(40).optional(),
  ),
  role: z.enum(ROLES),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
  password: z.string(),
  employeeNumber: z.string().trim().min(2).max(30),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  department: z.string().trim().min(1).max(80),
  designation: z.string().trim().min(1).max(80),
  managerId: optionalTrimmedString,
  joiningDate: z.coerce.date(),
  baseSalary: z.coerce.number().min(0).default(0),
}).refine((value) => Boolean(value.email || value.loginId), {
  message: "Enter either a valid email address or a login ID.",
  path: ["email"],
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z
    .enum(["INVITED", "ACTIVE", "SUSPENDED", "LOCKED", "OFFBOARDED", "DELETED"])
    .optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
