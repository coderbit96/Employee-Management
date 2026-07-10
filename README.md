# Employee Management System

Next.js App Router rebuild based on the PRD in the parent workspace. The current implementation covers the Phase 1 foundation and the first Phase 2 identity/provisioning slice.

## Implemented

- Next.js 16, TypeScript, Tailwind CSS, Framer Motion, MongoDB/Mongoose.
- Secure HttpOnly cookie JWT login flow.
- No public signup page or unauthenticated account creation route.
- One-time Super Admin seed command that refuses to overwrite an existing Super Admin.
- Central role and permission checks for account provisioning.
- Super Admin-controlled user creation with set passwords for immediate login.
- Password change, forgot-password, and reset-password API/UI.
- User, employee profile, and audit log Mongoose models.
- Audit events for seed, login success/failure, password changes, reset requests, account creation, and employee profile updates.
- Protected dashboard, user provisioning, account list, and employee directory UI.
- Employee directory API with manager self-assignment and reporting-cycle prevention.
- Super Admin/HR employee delete permanently removes the employee profile, linked login, attendance, leave, and salary records from MongoDB.
- Daily attendance check-in/check-out with duration calculation.
- Employee leave mail and HR/Super Admin mailbox.
- Formal leave requests with overlap prevention and HR/Super Admin approval/rejection.
- Salary payment records with draft, paid, and reversed statuses.
- Payroll page for processors and employee payment history.
- Super Admin audit log viewer.
- Permission unit tests for Super Admin provisioning and employee directory boundaries.

## Setup

```bash
cp .env.example .env.local
npm install
```

Update `.env.local` with a real `MONGODB_URI`, strong JWT secrets, and temporary seed credentials.

If login returns a 500 error in development, check `.env.local` first. Next.js does not load `.env.example`, and the MongoDB URI must not contain `<db_password>` or `<replace-db-password>`.

Seed the first Super Admin:

```bash
npm run seed:super-admin
```

After first login, rotate or remove `SEED_SUPER_ADMIN_PASSWORD` from the environment.

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Verification

```bash
npm run lint
npm run test
npm run build
```

## Next PRD Phases

- Add richer password reset and session management screens.
- Add richer employee profile editing UI, suspension, and offboarding.
- Add attendance photo/location metadata, correction workflow, history, and scoped map view.
- Add leave ledger balances, paid/unpaid split, cancellation workflow, and yearly summaries.
- Add notification retries, reports, advanced settings, and deployment hardening.
