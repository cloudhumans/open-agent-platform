import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const KEY_LENGTH = 32;

const FALLBACK_KEY = "dev-fallback-key-32-bytes-padded";

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const envVar = process.env.MCP_ENCRYPTION_KEY;

  if (!envVar) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MCP_ENCRYPTION_KEY is required in production. Set a 64-char hex string (32 bytes).",
      );
    }
    console.warn(
      "[MCP] MCP_ENCRYPTION_KEY not set — using insecure dev fallback. Set this env var in production.",
    );
    const key = Buffer.from(
      FALLBACK_KEY.padEnd(KEY_LENGTH, "0").slice(0, KEY_LENGTH),
    );
    _cachedKey = key;
    return key;
  }

  const key = Buffer.from(envVar, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `MCP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Got ${key.length} bytes.`,
    );
  }

  _cachedKey = key;
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted value format. Expected iv:authTag:ciphertext.",
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function maskCredential(raw: string | null): string | null {
  if (!raw || raw.length < 4) {
    return null;
  }
  return `\u2022\u2022\u2022\u2022\u2022\u2022${raw.slice(-4)}`;
}
