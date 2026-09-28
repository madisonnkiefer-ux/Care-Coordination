import * as z from "zod";

// A human name (user, vendor, office, member) has no legitimate reason to
// contain angle brackets — rejecting them server-side, independent of
// whatever the browser's own input did or didn't check, closes off
// HTML/tag-shaped input at the one place it actually matters (React
// already escapes this on render, so this isn't an XSS fix — it's
// rejecting malformed input at the boundary instead of only trusting
// client-side checks).
export const NAME_INVALID_CHARS = /[<>]/;
export const NAME_INVALID_MESSAGE = "Name can't contain < or > characters.";

export function nameField(requiredMessage: string) {
  return z
    .string()
    .min(1, { error: requiredMessage })
    .regex(/^[^<>]*$/, { error: NAME_INVALID_MESSAGE });
}
