# Employee Management System

Next.js App Router rebuild based on the PRD in the parent workspace. The current implementation covers the Phase 1 foundation and the first Phase 2 identity/provisioning slice.

## Implemented

- Next.js 16, TypeScript, Tailwind CSS, Framer Motion, MongoDB/Mongoose.
- Secure HttpOnly cookie JWT login flow.
- No public signup page or unauthenticated account creation route.
- One-time Super Admin seed command that refuses to overwrite an existing Super Admin.
- Central role and permission checks for account provisioning.
- Admin-controlled user creation with unique temporary passwords.
- User, employee profile, and audit log Mongoose models.
- Audit events for seed, login success/failure, and account creation.
- Protected dashboard and user provisioning UI.
- Permission unit tests for Admin creation boundaries.

## Setup

```bash
cp .env.example .env.local
npm install
```

Update `.env.local` with a real `MONGODB_URI`, strong JWT secrets, and temporary seed credentials.

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

- Add activation and password reset screens.
- Add employee directory, manager assignment validation, suspension, and offboarding.
- Add attendance check-in/out, photo/location metadata, correction workflow, and scoped map view.
- Add leave policy, overlap checks, approval routing, and ledger summaries.
- Add salary payment records, notification retries, reports, and audit viewer.

