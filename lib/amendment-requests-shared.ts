// Constant safe to import from Client Components — lib/data/amendment-requests.ts
// itself is server-only (it queries the database), but the Patient Rights
// tab and the on-chart amendment card both need this number to render due-by
// badges without a server round trip.
//
// HIPAA gives a covered entity 60 days to act on a request to amend a
// record (one 30-day extension allowed with notice) — see 45 CFR §164.526(b).
export const AMENDMENT_RESPONSE_DAYS = 60;
