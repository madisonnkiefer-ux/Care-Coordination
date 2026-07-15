# CareCoord Hub

A standalone care coordination web application: member charts, CNA/HRA
assessments, care plans, tasks, and a HIPAA-oriented audit trail. Built with
Next.js (App Router), Prisma, and Postgres.

This replaces an in-progress AppSmith build with a real, URL-addressable app
that isn't tied to the AppSmith runtime.

## Stack

- **Next.js 16** (App Router, Server Actions, Proxy)
- **Prisma 7** + **Postgres** (via `@prisma/adapter-pg`)
- **jose**-based encrypted session cookies (custom auth, no third-party auth vendor)
- **Tailwind CSS 4**, **recharts**, **lucide-react**

## Local setup

1. Postgres running locally, with a database created:
   ```bash
   createdb care_coord_hub
   ```
2. Copy `.env` and set `DATABASE_URL` / `SESSION_SECRET` (generate a real
   secret for anything beyond local dev: `openssl rand -base64 32`).
3. Install dependencies and push the schema:
   ```bash
   npm install
   npx prisma db push
   npx prisma db seed   # demo data only — see prisma/seed.ts
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

Demo logins after seeding (password `DemoPass123!` for all):

| Email | Role |
|---|---|
| jessica.martinez@demo.carecoord.local | Care Coordinator |
| amanda.johnson@demo.carecoord.local | Care Coordinator |
| michael.brown@demo.carecoord.local | Care Coordinator |
| dana.whitfield@demo.carecoord.local | Supervisor |
| admin@demo.carecoord.local | Admin |

## Architecture notes

- **Data Access Layer** (`lib/dal.ts`): every page, Server Action, and route
  handler re-verifies the session and re-checks authorization itself — this
  follows Next.js's data-security guidance that Proxy/layout-level checks
  alone aren't sufficient, since Server Actions are independent entry points.
- **Audit log** (`lib/audit.ts`, `AuditLog` model): every PHI view/create/
  update, plus login/logout/failed-login, is recorded with who, what, and
  when — visible to Supervisor/Admin roles at `/audit`.
- **RBAC**: `CARE_COORDINATOR` can only see members assigned to them;
  `SUPERVISOR`/`ADMIN` see the whole clinic. Enforced in `lib/dal.ts`, not
  just in the UI.
- **Session / auto-logoff**: 15-minute idle timeout, 8-hour absolute cap.
  Refreshed in `proxy.ts` (the only place allowed to write response cookies
  on a normal page request); `lib/dal.ts` only reads/validates.

## What this does *not* cover

Building the app is one piece of HIPAA compliance. Still outside this
codebase, and requiring organizational/legal decisions:

- A signed **Business Associate Addendum (BAA)** with your hosting provider
  and any third-party services.
- Deploying into a **HIPAA-eligible AWS account** (or equivalent) with
  encryption at rest (KMS), private networking, and CloudTrail logging.
- A formal **HIPAA Security Risk Assessment**, breach notification plan,
  data retention/disposal policy, and staff PHI-handling training.
- **Penetration testing** / vulnerability scanning before go-live.

See the project checklist for the full rollout plan.
