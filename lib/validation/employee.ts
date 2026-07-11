import { z } from "zod";

export const listEmployeesQuerySchema = z.object({
  q: z.string().trim().optional(),
  department: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "OFFBOARDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "employeeNumber", "department", "joiningDate", "status"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  department: z.string().trim().min(1).max(80).optional(),
  designation: z.string().trim().min(1).max(80).optional(),
  managerId: z.string().trim().nullable().optional(),
  joiningDate: z.coerce.date().optional(),
  baseSalary: z.coerce.number().min(0).optional(),
  employmentStatus: z.enum(["ACTIVE", "SUSPENDED", "OFFBOARDED"]).optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const deleteEmployeeSchema = z.object({
  confirmation: z.literal("DELETE"),
});
