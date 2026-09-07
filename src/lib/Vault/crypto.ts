/**
 * The vault at rest.
 *
 * Everything the app keeps — the 2FA secrets and the saved notes — lives as one
 * AES-GCM ciphertext in this browser's storage. The key is derived from the
 * passphrase with PBKDF2 and exists only in memory, so what is on disk is a
 * blob that is useless without the passphrase, and closing the app or locking
 * the vault leaves nothing behind that can be decrypted.
 *
 * Three consequences worth stating in the app itself, because they are the
 * honest cost of having no server:
 *
 *  - **A forgotten passphrase is unrecoverable.** There is nobody to ask. That
 *    is the same property that makes the blob safe.
 *  - **The store is one file.** A single blob means the *number* of entries and
 *    the length of their names leak nothing, which per-key encryption would.
 *  - **This is not a substitute for a hardware key.** A passphrase typed into a
 *    browser on a compromised machine is readable while the vault is unlocked.
 *
 * AES-GCM and PBKDF2 are chosen because `crypto.subtle` implements both — no
 * dependency, no WASM download, and it works offline. PBKDF2 is weaker per
 * unit of work than Argon2id, which is not available here; the iteration count
 * compensates as far as it can and {@link ITERATIONS} says what it assumes.
 */

/**
 * PBKDF2-SHA-256 iterations. OWASP's 2023 floor is 600,000, and this sits at
 * that figure: it costs a laptop the better part of a second to unlock, which
 * is a fine price once per session and a serious tax on an attacker running
 * the same derivation for every candidate passphrase.
 *
 * Stored *in* the blob rather than assumed, so raising it later doesn't lock
 * anyone out of a vault written today.
 */
export const ITERATIONS = 600_000;

const SALT_BYTES = 16;
const IV_BYTES = 12;

/** The envelope written to storage. Versioned so the format can move. */
export interface VaultBlob {
  v: 1;
  /** Base64 PBKDF2 salt. */
  salt: string;
  /** Iterations this blob was written with. */
  iterations: number;
  /** Base64 AES-GCM nonce. */
  iv: string;
  /** Base64 ciphertext, authentication tag included. */
  ct: string;
}

export const isVaultBlob = (value: unknown): value is VaultBlob => {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Partial<VaultBlob>;
  return (
    b.v === 1 &&
    typeof b.salt === "string" &&
    typeof b.iv === "string" &&
    typeof b.ct === "string" &&
    typeof b.iterations === "number"
  );
};

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

/** Derive the AES key for a passphrase and salt. Deliberately slow. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = ITERATIONS,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase) as unknown as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as ArrayBuffer, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    // Not extractable: nothing in the app can read the key back out, so it
    // cannot be persisted or logged by mistake.
    false,
    ["encrypt", "decrypt"],
  );
}

/** An unlocked vault: the key, and the salt it came from, held in memory only. */
export interface VaultKey {
  key: CryptoKey;
  salt: Uint8Array;
  iterations: number;
}

/** Start a new vault — a fresh salt and a key derived for it. */
export async function createKey(passphrase: string): Promise<VaultKey> {
  const salt = randomBytes(SALT_BYTES);
  return { key: await deriveKey(passphrase, salt), salt, iterations: ITERATIONS };
}

/** Re-derive the key for an existing blob. */
export async function unlockKey(passphrase: string, blob: VaultBlob): Promise<VaultKey> {
  const salt = fromBase64(blob.salt);
  return {
    key: await deriveKey(passphrase, salt, blob.iterations),
    salt,
    iterations: blob.iterations,
  };
}

/** Encrypt the vault's contents under an unlocked key. */
export async function seal(vaultKey: VaultKey, contents: unknown): Promise<VaultBlob> {
  const iv = randomBytes(IV_BYTES);
  const plain = new TextEncoder().encode(JSON.stringify(contents));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    vaultKey.key,
    plain as unknown as ArrayBuffer,
  );

  return {
    v: 1,
    salt: toBase64(vaultKey.salt),
    iterations: vaultKey.iterations,
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ct)),
  };
}

/**
 * Decrypt a blob. Throws on a wrong passphrase — GCM's authentication tag
 * fails rather than yielding plausible rubbish, which is the property that
 * makes "is this the right passphrase?" answerable at all.
 */
export async function open<T>(vaultKey: VaultKey, blob: VaultBlob): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) as unknown as ArrayBuffer },
    vaultKey.key,
    fromBase64(blob.ct) as unknown as ArrayBuffer,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** A random base32-friendly id for a vault entry. */
export function entryId(): string {
  return toBase64(randomBytes(9)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}
