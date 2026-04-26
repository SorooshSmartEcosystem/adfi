// AES-256-GCM encryption for tokens we must store at rest (Meta access
// tokens, LinkedIn tokens, etc.). Per CLAUDE.md these are required to be
// encrypted; this is the canonical helper.
//
// Key: 32-byte secret in base64 from TOKEN_ENCRYPTION_KEY. Generate with:
//   openssl rand -base64 32
// Output format: <iv-base64>:<ciphertext-base64>:<auth-tag-base64>
// All three parts urlsafe-b64; colon-separated; ~88 bytes for typical token.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set (base64-encoded 32 bytes).",
    );
  }
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got " +
        buf.length +
        ").",
    );
  }
  return buf;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}:${ct.toString("base64url")}:${tag.toString("base64url")}`;
}

export function decryptToken(payload: string): string {
  const [ivStr, ctStr, tagStr] = payload.split(":");
  if (!ivStr || !ctStr || !tagStr) {
    throw new Error("encrypted token format invalid");
  }
  const iv = Buffer.from(ivStr, "base64url");
  const ct = Buffer.from(ctStr, "base64url");
  const tag = Buffer.from(tagStr, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
