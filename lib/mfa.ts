import "server-only";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ISSUER = "Avanza Care";
const BACKUP_CODE_COUNT = 10;

function totpFor(secretBase32: string, email: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSecret(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  return {
    secretBase32: secret.base32,
    otpauthUrl: totpFor(secret.base32, email).toString(),
  };
}

// For re-deriving the same enrollment QR/URI across renders from an
// already-persisted secret, without generating (and discarding) a new one.
export function totpUrlForSecret(secretBase32: string, email: string) {
  return totpFor(secretBase32, email).toString();
}

// window: 1 accepts the previous/next 30s step too, tolerating minor clock
// drift between the server and the user's authenticator app.
export function verifyTotpCode(secretBase32: string, email: string, code: string) {
  const delta = totpFor(secretBase32, email).validate({ token: code.trim(), window: 1 });
  return delta !== null;
}

// Formatted as XXXX-XXXX for readability; drawn from a set that excludes
// visually ambiguous characters (0/O, 1/I/L).
const BACKUP_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomBackupCode() {
  const chars = Array.from({ length: 8 }, () => BACKUP_CODE_ALPHABET[crypto.randomInt(BACKUP_CODE_ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function generateBackupCodes() {
  return Array.from({ length: BACKUP_CODE_COUNT }, randomBackupCode);
}

export async function hashBackupCodes(codes: string[]) {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

// Single-use: returns the hash list with the matched entry removed, so the
// caller can persist it back and the same code can't be replayed.
export async function consumeBackupCode(hashes: string[], code: string) {
  const normalized = code.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      return { matched: true, remainingHashes: [...hashes.slice(0, i), ...hashes.slice(i + 1)] };
    }
  }
  return { matched: false, remainingHashes: hashes };
}
