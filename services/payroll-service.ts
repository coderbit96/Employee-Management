import { Types } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveRequest } from "@/models/LeaveRequest";
import { SalaryPayment } from "@/models/SalaryPayment";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type {
  CreateSalaryPaymentInput,
  ListSalaryPaymentsQuery,
  MarkPaidInput,
  ReversePaymentInput,
  UpdateSalaryPaymentInput,
} from "@/lib/validation/payroll";
import type { SafeUser } from "@/types/domain";
import { createNotifications } from "@/services/notification-service";

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export class PayrollServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function createSalaryPayment(
  input: CreateSalaryPaymentInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();
  assertCanProcessPayroll(actor);
  const employeeIds = input.employeeIds?.length
    ? input.employeeIds
    : input.employeeId
      ? [input.employeeId]
      : [];
  const salaryPayments = [];

  for (const employeeId of employeeIds) {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new PayrollServiceError("EMPLOYEE_NOT_FOUND", "Employee not found.", 404);
    }

    const employee = await EmployeeProfile.findOne({
      _id: employeeId,
      employmentStatus: "ACTIVE",
      deletedAt: { $exists: false },
    });

    if (!employee) {
      throw new PayrollServiceError("EMPLOYEE_NOT_FOUND", "Employee not found.", 404);
    }

    await assertEmployeeInPayrollScope(actor, employee._id);

    const duplicatePaid = await SalaryPayment.findOne({
      employeeId: employee._id,
      payPeriod: input.payPeriod,
      status: "PAID",
    }).lean();

    if (duplicatePaid) {
      throw new PayrollServiceError(
        "DUPLICATE_PAID_PERIOD",
        "A paid salary record already exists for this employee and period.",
        409,
      );
    }

    const baseAmount = employee.salary?.baseAmount ?? 0;
    const netAmount = baseAmount + input.bonuses - input.deductions;

    if (netAmount < 0) {
      throw new PayrollServiceError(
        "NEGATIVE_NET_PAY",
        "Net salary cannot be negative.",
        422,
      );
    }

    const exceptionSnapshot = await buildExceptionSnapshot(
      employee._id,
      input.payPeriod,
    );

    const payment = await SalaryPayment.create({
      employeeId: employee._id,
      userId: employee.userId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.employeeNumber,
      payPeriod: input.payPeriod,
      baseAmount,
      deductions: input.deductions,
      bonuses: input.bonuses,
      netAmount,
      currency: employee.salary?.currency ?? "INR",
      status: "DRAFT",
      paymentMethod: input.paymentMethod,
      exceptionSnapshot,
      processedBy: actor.id,
    });

    await writeAuditLog({
      actor,
      action: "SALARY_PAYMENT_CREATED",
      entityType: "SalaryPayment",
      entityId: payment._id,
      requestId: context.requestId,
      ipHash: context.ipHash,
      userAgent: context.userAgent,
      summary: {
        employeeName: payment.employeeName,
        payPeriod: payment.payPeriod,
        netAmount: payment.netAmount,
        exceptionSnapshot,
      },
    });

    salaryPayments.push(toSalaryPayment(payment));
  }

  return {
    salaryPayment: salaryPayments[0],
    salaryPayments,
  };
}

export async function listSalaryPayments(
  actor: SafeUser,
  query: ListSalaryPaymentsQuery,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};

  if (actor.role === "EMPLOYEE") {
    filter.userId = new Types.ObjectId(actor.id);
  } else if (actor.role === "MANAGER") {
    const manager = await EmployeeProfile.findOne({ userId: actor.id, deletedAt: { $exists: false } }).select("_id").lean();
    filter.employeeId = manager ? { $in: (await EmployeeProfile.find({ managerId: manager._id }).select("_id").lean()).map((item) => item._id) } : { $in: [] };
  } else if (!canViewPayroll(actor)) {
    throw new PayrollServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot view payroll records.",
      403,
    );
  }

  if (query.employeeId) {
    if (!Types.ObjectId.isValid(query.employeeId)) {
      throw new PayrollServiceError("EMPLOYEE_NOT_FOUND", "Employee not found.", 404);
    }
    filter.employeeId = new Types.ObjectId(query.employeeId);
  }

  if (query.payPeriod) {
    filter.payPeriod = query.payPeriod;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const payments = await SalaryPayment.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return { salaryPayments: payments.map(toSalaryPayment) };
}

export async function markSalaryPaymentPaid(
  paymentId: string,
  input: MarkPaidInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();
  assertCanProcessPayroll(actor);
  const payment = await getPayment(paymentId);

  if (!["DRAFT", "PROCESSING"].includes(payment.status)) {
    throw new PayrollServiceError(
      "PAYMENT_REVERSED",
      "Only a draft or processing payment can be marked paid.",
      409,
    );
  }

  const duplicatePaid = await SalaryPayment.findOne({
    _id: { $ne: payment._id },
    employeeId: payment.employeeId,
    payPeriod: payment.payPeriod,
    status: "PAID",
  }).lean();

  if (duplicatePaid) {
    throw new PayrollServiceError(
      "DUPLICATE_PAID_PERIOD",
      "A paid salary record already exists for this employee and period.",
      409,
    );
  }

  payment.status = "PAID";
  payment.paymentDate = new Date();
  payment.paymentMethod = input.paymentMethod ?? payment.paymentMethod;
  payment.processedBy = new Types.ObjectId(actor.id);
  await payment.save();

  await writeAuditLog({
    actor,
    action: "SALARY_PAYMENT_MARKED_PAID",
    entityType: "SalaryPayment",
    entityId: payment._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeName: payment.employeeName,
      payPeriod: payment.payPeriod,
      netAmount: payment.netAmount,
    },
  });

  await createNotifications([
    {
      recipientUserId: payment.userId,
      title: "Salary payment received",
      message: `${payment.payPeriod} salary payment was marked paid.`,
      entityType: "SalaryPayment",
      entityId: payment._id,
    },
    {
      recipientUserId: payment.userId,
      title: "Salary payment received",
      message: `${payment.payPeriod} salary payment was marked paid.`,
      entityType: "SalaryPayment",
      entityId: payment._id,
      channel: "EMAIL",
    },
  ]);

  return { salaryPayment: toSalaryPayment(payment) };
}

export async function updateSalaryPayment(paymentId: string, input: UpdateSalaryPaymentInput, actor: SafeUser, context: RequestContext) {
  await connectToDatabase(); assertCanProcessPayroll(actor); const payment = await getPayment(paymentId); await assertEmployeeInPayrollScope(actor, payment.employeeId);
  const allowed: Record<string, string[]> = { DRAFT: ["DRAFT", "PROCESSING", "FAILED"], PROCESSING: ["DRAFT", "PROCESSING", "FAILED"], FAILED: ["DRAFT", "FAILED"] };
  if (!allowed[payment.status]?.includes(input.status)) throw new PayrollServiceError("INVALID_TRANSITION", `Cannot transition ${payment.status} to ${input.status}.`, 409);
  if (input.deductions !== undefined || input.bonuses !== undefined) {
    if (payment.status !== "DRAFT") throw new PayrollServiceError("PAYMENT_LOCKED", "Amounts can be edited only while the payment is a draft.", 409);
    payment.deductions = input.deductions ?? payment.deductions; payment.bonuses = input.bonuses ?? payment.bonuses; payment.netAmount = payment.baseAmount + payment.bonuses - payment.deductions;
    if (payment.netAmount < 0) throw new PayrollServiceError("NEGATIVE_NET_PAY", "Net salary cannot be negative.", 422);
  }
  payment.status = input.status; if (input.paymentMethod !== undefined) payment.paymentMethod = input.paymentMethod; await payment.save();
  await writeAuditLog({ actor, action: "SALARY_PAYMENT_UPDATED", entityType: "SalaryPayment", entityId: payment._id, ...context, summary: { status: payment.status } });
  return { salaryPayment: toSalaryPayment(payment) };
}

export async function reverseSalaryPayment(
  paymentId: string,
  input: ReversePaymentInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (actor.role !== "SUPER_ADMIN" && !actor.permissions.includes("PROCESS_PAYROLL")) {
    throw new PayrollServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only the Super Admin can reverse salary payments.",
      403,
    );
  }

  const payment = await getPayment(paymentId);

  if (payment.status !== "PAID") {
    throw new PayrollServiceError(
      "PAYMENT_NOT_PAID",
      "Only paid salary records can be reversed.",
      409,
    );
  }

  payment.status = "REVERSED";
  payment.reversedBy = new Types.ObjectId(actor.id);
  payment.reversedAt = new Date();
  payment.reversalReason = input.reason;
  await payment.save();

  await writeAuditLog({
    actor,
    action: "SALARY_PAYMENT_REVERSED",
    entityType: "SalaryPayment",
    entityId: payment._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeName: payment.employeeName,
      payPeriod: payment.payPeriod,
      reason: input.reason,
    },
  });

  return { salaryPayment: toSalaryPayment(payment) };
}

export async function deleteSalaryPaymentHistory(
  paymentId: string,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (!canClearPayrollHistory(actor)) {
    throw new PayrollServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot clear salary payment history.",
      403,
    );
  }

  const payment = await getPayment(paymentId);
  await payment.deleteOne();

  await writeAuditLog({
    actor,
    action: "SALARY_PAYMENT_HISTORY_CLEARED",
    entityType: "SalaryPayment",
    entityId: payment._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeName: payment.employeeName,
      payPeriod: payment.payPeriod,
      status: payment.status,
      netAmount: payment.netAmount,
    },
  });

  return { deleted: true, paymentId };
}

function canViewPayroll(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role);
}

function assertCanProcessPayroll(actor: SafeUser) {
  if (!["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role) && !actor.permissions.includes("PROCESS_PAYROLL")) {
    throw new PayrollServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot process salary payments.",
      403,
    );
  }
}

function canClearPayrollHistory(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role);
}

async function assertEmployeeInPayrollScope(actor: SafeUser, employeeId: Types.ObjectId) {
  if (actor.role !== "MANAGER") return;
  const manager = await EmployeeProfile.findOne({ userId: actor.id, deletedAt: { $exists: false } }).select("_id").lean();
  const teamMember = manager && await EmployeeProfile.exists({ _id: employeeId, managerId: manager._id });
  if (!teamMember) {
    throw new PayrollServiceError("OUT_OF_SCOPE", "Managers can process salary only for assigned team members.", 403);
  }
}

async function getPayment(paymentId: string) {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw new PayrollServiceError("PAYMENT_NOT_FOUND", "Payment not found.", 404);
  }

  const payment = await SalaryPayment.findById(paymentId);

  if (!payment) {
    throw new PayrollServiceError("PAYMENT_NOT_FOUND", "Payment not found.", 404);
  }

  return payment;
}

async function buildExceptionSnapshot(employeeId: Types.ObjectId, payPeriod: string) {
  const { start, end } = getPayPeriodRange(payPeriod);
  const [attendanceRecords, approvedLeaves] = await Promise.all([
    Attendance.find({
      employeeId,
      workDate: {
        $gte: start.toISOString().slice(0, 10),
        $lte: end.toISOString().slice(0, 10),
      },
    }).lean(),
    LeaveRequest.find({
      employeeId,
      status: "APPROVED",
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean(),
  ]);
  const incompleteAttendanceDays = attendanceRecords.filter(
    (record) => record.status !== "CHECKED_OUT" || record.exception !== "NONE",
  ).length;
  const approvedLeaveDays = approvedLeaves.reduce(
    (total, leave) => total + (leave.requestedDays ?? 0),
    0,
  );
  const unpaidLeaveDays = approvedLeaves.reduce(
    (total, leave) => total + (leave.unpaidDays ?? 0),
    0,
  );
  const notes = [];

  if (incompleteAttendanceDays) {
    notes.push(`${incompleteAttendanceDays} attendance exception day(s)`);
  }

  if (unpaidLeaveDays) {
    notes.push(`${unpaidLeaveDays} unpaid leave day(s)`);
  }

  return {
    attendanceDays: attendanceRecords.length,
    incompleteAttendanceDays,
    approvedLeaveDays,
    unpaidLeaveDays,
    notes,
  };
}

function getPayPeriodRange(payPeriod: string) {
  const [year, month] = payPeriod.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { start, end };
}

function toSalaryPayment(payment: {
  _id: { toString(): string };
  employeeId: { toString(): string };
  userId: { toString(): string };
  employeeName: string;
  employeeEmail: string;
  payPeriod: string;
  baseAmount: number;
  deductions: number;
  bonuses: number;
  netAmount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  paymentDate?: Date | null;
  exceptionSnapshot?: {
    attendanceDays?: number | null;
    incompleteAttendanceDays?: number | null;
    approvedLeaveDays?: number | null;
    unpaidLeaveDays?: number | null;
    notes?: string[] | null;
  } | null;
  createdAt?: Date;
}) {
  return {
    id: payment._id.toString(),
    employeeId: payment.employeeId.toString(),
    userId: payment.userId.toString(),
    employeeName: payment.employeeName,
    employeeEmail: payment.employeeEmail,
    payPeriod: payment.payPeriod,
    baseAmount: payment.baseAmount,
    deductions: payment.deductions,
    bonuses: payment.bonuses,
    netAmount: payment.netAmount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.paymentMethod ?? undefined,
    paymentDate: payment.paymentDate?.toISOString(),
    exceptionSnapshot: payment.exceptionSnapshot
      ? {
          attendanceDays: payment.exceptionSnapshot.attendanceDays ?? 0,
          incompleteAttendanceDays:
            payment.exceptionSnapshot.incompleteAttendanceDays ?? 0,
          approvedLeaveDays: payment.exceptionSnapshot.approvedLeaveDays ?? 0,
          unpaidLeaveDays: payment.exceptionSnapshot.unpaidLeaveDays ?? 0,
          notes: payment.exceptionSnapshot.notes ?? [],
        }
      : undefined,
    createdAt: payment.createdAt?.toISOString(),
  };
}
