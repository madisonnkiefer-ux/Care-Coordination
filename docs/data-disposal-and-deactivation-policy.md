# Data Disposal & Account Deactivation Policy

Care Coordination Hub — HIPAA administrative safeguard documentation.

This describes how the system actually behaves today, not an aspirational
policy — anywhere current behavior falls short of what a mature disposal
policy should eventually cover, it's called out explicitly rather than
glossed over.

## 1. Patient Records

### 1.1 "Deleting" a patient is a soft delete, never a hard delete

Only an Admin can delete a patient chart (Settings requires the Admin role;
the delete action itself additionally requires typing the patient's exact
name to confirm). Deleting a chart:

- Sets `Member.deletedAt` and `Member.deletedById` — the row and everything
  under it (intake versions, assessments, care plans, touchpoints, tasks,
  documents, etc.) stays in the database untouched.
- Immediately disappears from every normal view, search, and report. This
  is enforced once, centrally, by a Prisma Client extension
  (`lib/db.ts`) that filters `deletedAt: null` on every query against
  `Member` — individual pages and reports don't each need to remember to
  filter it out.
- Is recorded in the audit log (`action: DELETE`, `resource: Member`).

**Why soft delete:** Medicaid and HIPAA record-retention requirements
outlive a patient's relationship with the clinic. A clinic cannot
permanently destroy a patient's care record just because a supervisor
clicked "delete" — the record may still be needed for billing audits,
continuity of care if the patient returns, or a compliance review years
later.

### 1.2 Restoring a deleted chart

Admins can restore a soft-deleted chart from Settings → Deleted Charts,
which clears `deletedAt`/`deletedById` and makes the chart visible again
everywhere. This is also audit-logged.

### 1.3 Uploaded documents

Member-uploaded files (consent forms, signed care plans, etc.) live in a
dedicated, encrypted S3 bucket (SSE-KMS, versioned, public access fully
blocked), referenced from Postgres only by object key — never a public
URL. There is currently **no way to delete an individual document**
through the app; a document persists for as long as its parent member
record exists in the database (which, per 1.1, is effectively forever
under normal operation). Noncurrent S3 object versions expire after 365
days as a storage-cost control, not a retention/disposal mechanism.

### 1.4 Backups

RDS automated backups are retained for **14 days**, enabling point-in-time
recovery within that window. This is a recovery safety net, not a
disposal control — it doesn't shorten or lengthen how long patient data
is retained in the live database.

### 1.5 What this system does not yet do

There is currently **no hard-delete or true destruction capability** for
patient data anywhere in the system — not through the app, and no
scheduled infrastructure job either. In practice, "disposal" today means
soft-delete (data hidden, not destroyed) plus the natural expiration of
backups and infrastructure logs. If the organization ever needs to
actually destroy PHI that has passed a defined retention period (state
Medicaid programs typically require 6–7 years), that would need to be a
deliberate, documented, admin-executed process — it isn't automated, and
nothing in the app currently performs it. This is a real gap worth a
decision from whoever owns compliance: define the retention period after
which records are eligible for true destruction, and whether that's ever
exercised in practice for a system where soft-delete already satisfies
day-to-day operational needs.

## 2. Staff Accounts

### 2.1 Offboarding an employee: deactivate, never delete

There is no "delete user" action in this app at all — by design. When
someone leaves (or is terminated), an Admin deactivates their account:
Settings → Users & Roles → find the user → **Deactivate**.

Deactivating a user:

- Sets `User.active = false`.
- **Blocks sign-in immediately** — login explicitly checks `active` before
  even checking the password, so a deactivated account cannot authenticate
  starting the moment it's turned off, regardless of any existing browser
  session (session cookies are still validated against the live user
  record on each request).
- Is audit-logged.
- Leaves the user's row (name, email, role) in place, because every audit
  log entry, every care plan note, every touchpoint they ever recorded
  references their `userId` as a foreign key — deleting the row would
  either break that history or force it to become anonymous ("Unknown
  user"), which would itself weaken the audit trail. Deactivation
  preserves "who did what" indefinitely while fully preventing further
  access.
- Removes them from active-coordinator pickers (assignment dropdowns,
  reporting filters) without erasing their historical caseload
  attribution.

### 2.2 Re-activating someone

Reactivating (e.g., an employee returning, or a deactivation done in
error) is the same toggle in reverse. Their password and MFA enrollment
are untouched by deactivation, so reactivating alone restores full
access — if there's any concern the credential may have been compromised
while inactive, force a password reset and use **Reset MFA** (Settings →
Users & Roles) to require re-enrollment before handing the account back.

### 2.3 Lost devices, compromised credentials

- **Password reset**: an Admin can trigger one from Settings → Users &
  Roles at any time, or a user can self-serve one from the login page.
- **MFA reset**: an Admin can clear a user's TOTP secret and backup codes
  (Settings → Users & Roles → Reset MFA) if they lose their authenticator
  device — this forces re-enrollment on next login.
- **Account lockout**: repeated failed logins lock an account
  automatically (self-healing after a cooldown, or an Admin can clear it
  early from Settings). See Settings → Security Alerts for a rollup of
  accounts with unusual failed-login activity.

## 3. Audit Trail Retention

Two separate audit trails exist, at different layers:

| Layer | What it covers | Retention |
|---|---|---|
| App audit log (`AuditLog` table) | Who viewed/created/updated/deleted which patient record, plus login/logout/lockout events | **Retained indefinitely today — no automated purge exists.** |
| Infrastructure audit trail (AWS CloudTrail) | AWS API-level activity (who changed infrastructure, accessed the documents bucket, etc.) | 7 years, via S3 lifecycle rules (transitions to cheaper storage over time, versioned so entries can't be silently overwritten or deleted) |

The app-level audit log growing without bound is worth a decision, not
necessarily a problem to fix reflexively — HIPAA generally favors *longer*
audit retention, and the table is small per row. If it ever needs bounding
for storage-cost reasons, archive old rows to cold storage rather than
deleting them outright.

## 4. Quick Reference

| I need to... | Where |
|---|---|
| Remove a patient chart from active use | Patient chart → Delete Chart (Admin only, type name to confirm) |
| Undo an accidental patient deletion | Settings → Deleted Charts → Restore |
| Offboard a staff member | Settings → Users & Roles → Deactivate |
| Restore a staff member's access | Settings → Users & Roles → Reactivate |
| Force a password reset | Settings → Users & Roles → Reset Password |
| Clear a lost/compromised MFA device | Settings → Users & Roles → Reset MFA |
| Review who's had unusual account/access activity | Settings → Security Alerts |
| See a full history of who touched a specific record | Settings → Audit Log (filterable by user) |
