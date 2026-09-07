import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  groupCode,
  isBase32,
  parseOtpauth,
  toOtpauth,
  totp,
} from "./totp";
import {
  alphabet,
  estimatePassphrase,
  estimatePassword,
  estimateTyped,
  generatePassphrase,
  generatePassword,
  gradeBits,
  humanTime,
  PASSWORD_DEFAULTS,
  randomInt,
} from "./generate";
import { createKey, open, seal, unlockKey } from "./crypto";
import { BITS_PER_WORD, WORDS } from "./wordlist";

/**
 * Vault.
 *
 * The failures here are all silent ones. A TOTP implementation that is subtly
 * wrong emits six plausible digits that no server accepts; a generator with a
 * biased random source produces passwords that look fine; a strength meter that
 * over-states is worse than no meter. So the code is measured against the
 * published RFC 6238 vectors, the generators against the alphabet they claim,
 * and the vault against a wrong passphrase.
 */

/** RFC 6238 Appendix B: the ASCII seed "12345678901234567890", as base32. */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32", () => {
  it("decodes the RFC seed back to its ASCII bytes", () => {
    expect(new TextDecoder().decode(base32Decode(RFC_SECRET))).toBe("12345678901234567890");
  });

  it("accepts the formatting issuers actually print", () => {
    const spaced = "gezd gnbv gy3t qojq gezd gnbv gy3t qojq";
    expect(base32Decode(spaced)).toEqual(base32Decode(RFC_SECRET));
    expect(base32Decode("JBSWY3DPEHPK3PXP===")).toEqual(base32Decode("JBSWY3DPEHPK3PXP"));
  });

  it("refuses a character that is not base32, rather than dropping it", () => {
    // "1" and "8" are not in the alphabet — silently skipping them would give a
    // short key and a stream of codes that are wrong for no visible reason.
    expect(() => base32Decode("JBSW1Y3D")).toThrow(/not a base32/);
    expect(isBase32("JBSW1Y3D")).toBe(false);
    expect(isBase32("")).toBe(false);
    expect(isBase32(RFC_SECRET)).toBe(true);
  });

  it("round-trips through the encoder", () => {
    const bytes = new Uint8Array([0x01, 0xff, 0x7a, 0x00, 0x42]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });
});

describe("totp", () => {
  // RFC 6238 Appendix B, the SHA-1 rows, with 8 digits.
  const vectors: [number, string][] = [
    [59, "94287082"],
    [1_111_111_109, "07081804"],
    [1_111_111_111, "14050471"],
    [1_234_567_890, "89005924"],
    [2_000_000_000, "69279037"],
    [20_000_000_000, "65353130"],
  ];

  it.each(vectors)("matches the RFC vector at t=%i", async (seconds, expected) => {
    const { code } = await totp({ secret: RFC_SECRET, digits: 8, period: 30 }, seconds * 1000);
    expect(code).toBe(expected);
  });

  it("matches the SHA-256 and SHA-512 vectors", async () => {
    // The longer seeds of Appendix B: the seed repeats to fill the hash's block.
    const seed32 = base32Encode(new TextEncoder().encode("12345678901234567890123456789012"));
    const seed64 = base32Encode(
      new TextEncoder().encode("1234567890123456789012345678901234567890123456789012345678901234"),
    );

    const sha256 = await totp(
      { secret: seed32, digits: 8, period: 30, algorithm: "SHA-256" },
      59_000,
    );
    const sha512 = await totp(
      { secret: seed64, digits: 8, period: 30, algorithm: "SHA-512" },
      59_000,
    );
    expect(sha256.code).toBe("46119246");
    expect(sha512.code).toBe("90693936");
  });

  it("pads a code that lands on a small number", async () => {
    const { code } = await totp({ secret: RFC_SECRET, digits: 6 }, 59_000);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("reports the life of the code, not just the code", async () => {
    // 1,000,000,020 is a whole multiple of 30, so this is exactly 20s into a step.
    const at = 1_000_000_040_000;
    const { secondsLeft, progress, counter } = await totp({ secret: RFC_SECRET, period: 30 }, at);
    expect(secondsLeft).toBe(10);
    expect(progress).toBeCloseTo(20 / 30, 5);
    expect(counter).toBe(1_000_000_020 / 30);
  });

  it("holds one code for a whole step and changes on the boundary", async () => {
    const step = 30_000;
    const base = 1_700_000_000_000 - (1_700_000_000_000 % step);
    const start = await totp({ secret: RFC_SECRET }, base);
    const end = await totp({ secret: RFC_SECRET }, base + step - 1);
    const next = await totp({ secret: RFC_SECRET }, base + step);
    expect(end.code).toBe(start.code);
    expect(next.code).not.toBe(start.code);
  });

  it("groups a code for reading aloud", () => {
    expect(groupCode("123456")).toBe("123 456");
    expect(groupCode("12345678")).toBe("1234 5678");
  });
});

describe("otpauth addresses", () => {
  it("reads issuer, label and every parameter", () => {
    const config = parseOtpauth(
      `otpauth://totp/GitHub:alex%40example.com?secret=${RFC_SECRET}&issuer=GitHub&algorithm=SHA256&digits=8&period=60`,
    );
    expect(config).toMatchObject({
      issuer: "GitHub",
      label: "alex@example.com",
      digits: 8,
      period: 60,
      algorithm: "SHA-256",
    });
  });

  it("takes the issuer from the path when there is no parameter", () => {
    expect(parseOtpauth(`otpauth://totp/Fastmail:me?secret=${RFC_SECRET}`).issuer).toBe("Fastmail");
  });

  it("defaults the way the Key Uri Format says", () => {
    const config = parseOtpauth(`otpauth://totp/plain?secret=${RFC_SECRET}`);
    expect(config).toMatchObject({ digits: 6, period: 30, algorithm: "SHA-1", issuer: "" });
  });

  it("refuses a counter-based code instead of treating it as time-based", () => {
    expect(() => parseOtpauth(`otpauth://hotp/x?secret=${RFC_SECRET}&counter=1`)).toThrow(/counter/);
  });

  it("refuses an address with no usable secret", () => {
    expect(() => parseOtpauth("otpauth://totp/x?secret=not!base32")).toThrow(/secret/);
    expect(() => parseOtpauth("https://example.com")).toThrow(/otpauth/);
  });

  it("round-trips an account back out to another authenticator", () => {
    const config = parseOtpauth(
      `otpauth://totp/GitHub:alex?secret=${RFC_SECRET}&issuer=GitHub&digits=8&period=60`,
    );
    expect(parseOtpauth(toOtpauth(config))).toEqual(config);
  });
});

describe("the wordlist", () => {
  it("is exactly 256 distinct words, so a word is a byte", () => {
    expect(WORDS).toHaveLength(256);
    expect(new Set(WORDS).size).toBe(256);
    expect(BITS_PER_WORD).toBe(8);
  });

  it("holds only typable lowercase words", () => {
    for (const word of WORDS) expect(word).toMatch(/^[a-z]{3,9}$/);
  });
});

describe("randomInt", () => {
  it("stays inside its bound and reaches both ends", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i += 1) {
      const n = randomInt(6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
      seen.add(n);
    }
    expect(seen.size).toBe(6);
  });

  it("refuses a bound it cannot satisfy", () => {
    expect(() => randomInt(0)).toThrow();
  });
});

describe("generatePassword", () => {
  it("honours the length and draws only from the chosen classes", () => {
    const options = { ...PASSWORD_DEFAULTS, length: 40, symbols: false };
    const password = generatePassword(options);
    expect(password).toHaveLength(40);
    expect(password).toMatch(/^[a-zA-Z0-9]+$/);
    for (const char of password) expect(alphabet(options)).toContain(char);
  });

  it("includes at least one of every class asked for", () => {
    // Run it a few times: a generator that merely usually satisfies the rule is
    // the bug, since a site rejects the one password that misses.
    for (let i = 0; i < 40; i += 1) {
      const password = generatePassword({ ...PASSWORD_DEFAULTS, length: 8 });
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/\d/);
      expect(password).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("drops the characters that get misread", () => {
    const password = generatePassword({ ...PASSWORD_DEFAULTS, length: 100, avoidAmbiguous: true });
    expect(password).not.toMatch(/[0Oo1lI|5S2Z]/);
  });

  it("does not put the guaranteed characters in a fixed order", () => {
    const firsts = new Set(
      Array.from({ length: 60 }, () => generatePassword({ ...PASSWORD_DEFAULTS, length: 12 })[0]),
    );
    // Without the shuffle every password would start with a lowercase letter.
    expect(firsts.size).toBeGreaterThan(4);
  });

  it("refuses to make a password out of nothing", () => {
    expect(() =>
      generatePassword({ ...PASSWORD_DEFAULTS, lower: false, upper: false, digits: false, symbols: false }),
    ).toThrow(/at least one/);
  });

  it("does not repeat itself", () => {
    const made = new Set(Array.from({ length: 200 }, () => generatePassword(PASSWORD_DEFAULTS)));
    expect(made.size).toBe(200);
  });
});

describe("generatePassphrase", () => {
  it("makes the number of words asked for, from the list", () => {
    const phrase = generatePassphrase({ words: 5, separator: "-", capitalize: false, number: false });
    const parts = phrase.split("-");
    expect(parts).toHaveLength(5);
    for (const part of parts) expect(WORDS).toContain(part);
  });

  it("capitalises and appends a digit when asked", () => {
    const phrase = generatePassphrase({ words: 4, separator: ".", capitalize: true, number: true });
    const parts = phrase.split(".");
    expect(parts).toHaveLength(5);
    expect(parts[4]).toMatch(/^\d$/);
    for (const word of parts.slice(0, 4)) expect(word).toMatch(/^[A-Z][a-z]+$/);
  });

  it("clamps a silly word count instead of obeying it", () => {
    expect(generatePassphrase({ words: 1, separator: "-", capitalize: false, number: false }).split("-")).toHaveLength(3);
    expect(generatePassphrase({ words: 99, separator: "-", capitalize: false, number: false }).split("-")).toHaveLength(12);
  });
});

describe("strength", () => {
  it("computes a password's entropy from its alphabet and length", () => {
    // 20 characters from all four classes: 26+26+10+27 = 89 → 20·log2(89).
    const strength = estimatePassword(PASSWORD_DEFAULTS);
    expect(strength.bits).toBeCloseTo(20 * Math.log2(89), 5);
    expect(strength.band).toBe("excellent");
  });

  it("computes a passphrase's entropy at 8 bits a word", () => {
    expect(estimatePassphrase({ words: 5, separator: "-", capitalize: false, number: false }).bits).toBe(40);
    expect(
      estimatePassphrase({ words: 5, separator: "-", capitalize: false, number: true }).bits,
    ).toBeCloseTo(40 + Math.log2(10), 5);
  });

  it("bands and fills consistently", () => {
    expect(gradeBits(20).band).toBe("weak");
    expect(gradeBits(60).band).toBe("fair");
    expect(gradeBits(80).band).toBe("good");
    expect(gradeBits(100).band).toBe("strong");
    expect(gradeBits(130).band).toBe("excellent");
    expect(gradeBits(200).fill).toBe(1);
    expect(gradeBits(0).fill).toBe(0);
  });

  it("reads a typed password low rather than high", () => {
    // The classic "looks strong to a character-class meter" password should not
    // out-score four random words.
    const trick = estimateTyped("Passw0rd!");
    const phrase = estimatePassphrase({ words: 4, separator: "-", capitalize: false, number: false });
    expect(trick.bits).toBeLessThan(phrase.bits);
    expect(estimateTyped("aaaaaaaaaaaaaaaa").bits).toBeLessThan(estimateTyped("f7Kq2xVm").bits);
    expect(estimateTyped("").bits).toBe(0);
  });

  it("describes a crack time in words a person can weigh", () => {
    expect(humanTime(0.2)).toBe("instantly");
    expect(humanTime(90)).toBe("2 minutes");
    expect(humanTime(3600 * 5)).toBe("5 hours");
    expect(humanTime(86_400 * 3)).toBe("3 days");
    expect(humanTime(31_557_600 * 4)).toBe("4 years");
    expect(humanTime(31_557_600 * 5e6)).toMatch(/million years/);
    expect(humanTime(Infinity)).toMatch(/longer/);
  });
});

describe("the vault at rest", () => {
  const contents = { accounts: [{ label: "me", secret: RFC_SECRET }], secrets: ["a note"] };

  // These derive a 600,000-iteration key, so they are the slow tests in the
  // suite. Two of them, deliberately: the round trip and the wrong passphrase
  // are the only behaviours that matter, and both need a real derivation.
  it("round-trips through a real key derivation", async () => {
    const key = await createKey("correct horse battery staple");
    const blob = await seal(key, contents);

    expect(blob.v).toBe(1);
    expect(blob.iterations).toBe(600_000);
    // The plaintext must not be recognisable anywhere in the envelope.
    expect(JSON.stringify(blob)).not.toContain(RFC_SECRET);
    expect(JSON.stringify(blob)).not.toContain("a note");

    const reopened = await open(await unlockKey("correct horse battery staple", blob), blob);
    expect(reopened).toEqual(contents);
  }, 30_000);

  it("fails on a wrong passphrase instead of returning rubbish", async () => {
    const key = await createKey("right");
    const blob = await seal(key, contents);
    await expect(open(await unlockKey("wrong", blob), blob)).rejects.toThrow();
  }, 30_000);

  it("gives every vault its own salt and every write its own nonce", async () => {
    const a = await createKey("same passphrase");
    const b = await createKey("same passphrase");
    expect(a.salt).not.toEqual(b.salt);

    const one = await seal(a, contents);
    const two = await seal(a, contents);
    expect(one.iv).not.toBe(two.iv);
    expect(one.ct).not.toBe(two.ct);
  }, 30_000);
});
