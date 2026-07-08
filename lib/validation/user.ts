import { z } from "zod";
import { PERMISSIONS, ROLES } from "@/types/domain";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  loginId: z.string().trim().toLowerCase().min(3).max(40).optional(),
  role: z.enum(ROLES),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
  employeeNumber: z.string().trim().min(2).max(30),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  department: z.string().trim().min(1).max(80),
  designation: z.string().trim().min(1).max(80),
  managerId: z.string().trim().optional(),
  joiningDate: z.coerce.date(),
  baseSalary: z.coerce.number().min(0).default(0),
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

