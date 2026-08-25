import { crc32, crcHex } from "@/lib/pack";

/**
 * Hashes.
 *
 * Checking a download against a published checksum, or fingerprinting a string,
 * is a thing people do by pasting into a website — which is precisely the wrong
 * place for it. WebCrypto does the real work here; nothing is sent anywhere, and
 * a file is read in chunks so its size doesn't matter.
 *
 * MD5 is deliberately absent: WebCrypto refuses to implement it, and shipping a
 * hand-rolled MD5 to support checksums that should not be trusted anyway is not
 * a trade worth making. The app says so rather than silently lacking it.
 */

export type HashId = "sha1" | "sha256" | "sha384" | "sha512" | "crc32";

export const HASHES: Array<{ id: HashId; label: string; hint: string }> = [
  { id: "sha256", label: "SHA-256", hint: "The usual choice for checksums" },
  { id: "sha1", label: "SHA-1", hint: "Legacy — broken for security, fine for identity" },
  { id: "sha384", label: "SHA-384", hint: "SHA-2 family" },
  { id: "sha512", label: "SHA-512", hint: "SHA-2 family" },
  { id: "crc32", label: "CRC-32", hint: "A check for corruption, not a hash" },
];

const SUBTLE: Record<Exclude<HashId, "crc32">, string> = {
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
};

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Hash a string. */
export async function hashText(text: string, id: HashId): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (id === "crc32") return crcHex(crc32(bytes));
  const digest = await crypto.subtle.digest(SUBTLE[id], bytes as unknown as BufferSource);
  return toHex(digest);
}

/** Bytes per read when hashing a file. */
const FILE_CHUNK = 8 * 1024 * 1024;

/**
 * Hash a file without loading it.
 *
 * WebCrypto has no streaming digest, so anything but CRC-32 has to see the whole
 * buffer at once — which is a real limit, and the reason a large file is offered
 * CRC-32 only rather than being allowed to crash the tab. `File.slice` keeps the
 * CRC path flat in memory at any size.
 */
export async function hashFile(
  file: File,
  id: HashId,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (id === "crc32") {
    let crc = 0;
    for (let at = 0; at < file.size; at += FILE_CHUNK) {
      const slice = await file.slice(at, at + FILE_CHUNK).arrayBuffer();
      crc = crc32(new Uint8Array(slice), crc);
      onProgress?.(Math.min(1, (at + FILE_CHUNK) / file.size));
    }
    return crcHex(crc);
  }
  const buffer = await file.arrayBuffer();
  onProgress?.(1);
  const digest = await crypto.subtle.digest(SUBTLE[id], buffer);
  return toHex(digest);
}

/**
 * Above this, only CRC-32 is offered for a file: the SHA family needs the whole
 * file in one buffer, and a browser will not hand over a two-gigabyte one.
 */
export const SHA_FILE_LIMIT = 512 * 1024 * 1024;
