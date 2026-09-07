"use client";

import { useMemo } from "react";
import { useCalcStore } from "@/store/useCalcStore";
import {
  applyBitOp,
  BASE_LABELS,
  BASE_PREFIX,
  BASES,
  BIT_OPS,
  bitsOf,
  formatInBase,
  overflows,
  parseInBase,
  popCount,
  toWidth,
  WIDTHS,
  type Base,
} from "@/lib/Calc/bases";
import { cx } from "@/lib/utils";

/**
 * One value, in every base, with its bits laid out and something to do to them.
 *
 * The bit grid is the reason this is a panel rather than four output fields.
 * "Is bit 6 set?" and "which flags does 0x2C mean?" are the questions a hex
 * value actually raises, and no amount of `formatInBase` answers them — you
 * have to see the bits, numbered, in the width you are working in. Every cell
 * is a button, so the grid reads *and* writes: tapping a bit flips it and
 * everything above re-reads.
 */
export function BasesPanel() {
  const text = useCalcStore((s) => s.baseText);
  const setText = useCalcStore((s) => s.setBaseText);
  const base = useCalcStore((s) => s.base);
  const setBase = useCalcStore((s) => s.setBase);
  const width = useCalcStore((s) => s.width);
  const setWidth = useCalcStore((s) => s.setWidth);
  const signed = useCalcStore((s) => s.signed);
  const setSigned = useCalcStore((s) => s.setSigned);
  const operandText = useCalcStore((s) => s.operandText);
  const setOperandText = useCalcStore((s) => s.setOperandText);
  const bitOp = useCalcStore((s) => s.bitOp);
  const setBitOp = useCalcStore((s) => s.setBitOp);

  const parsed = useMemo(() => parseInBase(text, base), [text, base]);
  const operand = useMemo(() => parseInBase(operandText, base), [operandText, base]);

  const value = parsed === null ? null : toWidth(parsed, width, signed);
  const wrapped = parsed !== null && overflows(parsed, width, signed);
  const bits = value === null ? [] : bitsOf(value, width);

  const op = BIT_OPS.find((candidate) => candidate.id === bitOp) ?? BIT_OPS[0];
  const outcome =
    value === null || (!op.unary && operand === null)
      ? null
      : applyBitOp(bitOp, value, operand ?? 0n, width);

  /**
   * Only decimal shows a negative. In binary, octal and hex the sign *is* the
   * top bit, so those bases show the masked pattern — "-ff" would be a number
   * no debugger, datasheet or memory dump ever prints.
   */
  const inBase = (v: bigint, candidate: Base): string =>
    formatInBase(toWidth(v, width, candidate === 10 && signed), candidate);

  /** Write a value back into the field, in the base being typed in. */
  const put = (next: bigint) =>
    setText(formatInBase(toWidth(next, width, base === 10 && signed), base, false));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label
            htmlFor="calc-base-value"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Value, read as {BASE_LABELS[base].toLowerCase()}
          </label>
          <div
            role="group"
            aria-label="Base to read the value in"
            className="flex overflow-hidden rounded-full border border-border"
          >
            {BASES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setBase(candidate)}
                aria-pressed={base === candidate}
                className={cx(
                  "px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[.08em]",
                  base === candidate
                    ? "bg-accent text-on-accent"
                    : "text-ink-soft hover:text-accent",
                )}
              >
                {BASE_LABELS[candidate]}
              </button>
            ))}
          </div>
        </div>

        <input
          id="calc-base-value"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={base === 10 ? "255" : `${BASE_PREFIX[base]}ff`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode={base === 10 ? "numeric" : "text"}
          aria-invalid={text.trim() !== "" && parsed === null ? true : undefined}
          aria-describedby="calc-base-note"
          className={cx(
            "mt-1.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 font-mono text-[16px] outline-none",
            parsed === null && text.trim() !== ""
              ? "border-danger text-danger"
              : "border-border focus:border-accent focus:ring-2 focus:ring-accent/25",
          )}
        />
        <p id="calc-base-note" className="mt-1.5 text-[11.5px] text-ink-soft">
          {parsed === null && text.trim() !== ""
            ? `Not a base-${base} number — those digits do not exist in it.`
            : "A 0x, 0b or 0o prefix overrides the base above, so a pasted value reads correctly whatever this is set to."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Register width in bits"
          className="flex overflow-hidden rounded-full border border-border"
        >
          {WIDTHS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setWidth(candidate)}
              aria-pressed={width === candidate}
              title={`Work in ${candidate} bits`}
              className={cx(
                "px-3 py-1.5 font-mono text-[10.5px] tabular-nums",
                width === candidate ? "bg-accent text-on-accent" : "text-ink-soft hover:text-accent",
              )}
            >
              {candidate}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSigned(!signed)}
          aria-pressed={signed}
          title="Read the top bit as a sign, in two's complement"
          className={cx(
            "rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em]",
            signed
              ? "border-accent bg-accent-soft text-accent"
              : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
          )}
        >
          Signed
        </button>

        {wrapped && (
          <span className="rounded-full border border-danger/50 bg-panel px-3 py-1.5 text-[11px] text-danger">
            Wraps at {width} bits
          </span>
        )}
      </div>

      {value !== null && (
        <>
          {/* Hairlines come from the container showing through a 1px gap, so the
              grid stays right whether it is one column or two. */}
          <dl className="m-0 grid gap-px overflow-hidden rounded-[14px] border border-border bg-border sm:grid-cols-2">
            {BASES.map((candidate) => (
              <div
                key={candidate}
                className="flex items-baseline justify-between gap-3 bg-panel px-3.5 py-2.5"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
                  {BASE_LABELS[candidate]}
                </dt>
                <dd className="m-0 min-w-0 truncate font-mono text-[14px] font-bold tabular-nums">
                  {inBase(value, candidate)}
                </dd>
              </div>
            ))}
          </dl>

          <figure className="m-0 rounded-[14px] border border-border bg-panel p-3.5">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-bold">The bits</h3>
              <p className="font-mono text-[11px] text-ink-soft">
                {popCount(value, width)} of {width} set
              </p>
            </figcaption>

            {/* Bytes wrap onto as many rows as the width needs, rather than
                scrolling sideways in one strip. A strip is the tidier layout
                and it hides the wrong half: it opens on the most significant
                bits, which in almost every value are the zeros, leaving the
                bits you were looking for off the right edge. Wrapped, the
                whole register is visible at 360px and reads MSB to LSB in
                ordinary reading order. */}
            <div className="mt-2.5 flex flex-wrap gap-2">
              {chunk(bits, 8).map((byte, byteIndex) => (
                <div key={byteIndex} className="flex gap-px">
                  {byte.map((bit, offset) => {
                    const position = width - 1 - (byteIndex * 8 + offset);
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => put(value ^ (1n << BigInt(position)))}
                        title={`Bit ${position} — click to ${bit ? "clear" : "set"} it`}
                        aria-label={`Bit ${position}, currently ${bit}`}
                        className={cx(
                          "grid size-7 place-items-center rounded-[4px] font-mono text-[11px] tabular-nums",
                          bit
                            ? "bg-accent text-on-accent"
                            : "bg-paper text-ink-soft hover:text-accent",
                        )}
                      >
                        {bit}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11.5px] text-ink-soft">
              Numbered from bit 0 on the right. Tap one to flip it.
            </p>
          </figure>
        </>
      )}

      <div className="rounded-[14px] border border-border bg-panel p-3.5">
        <h3 className="text-[13.5px] font-bold">Combine with another value</h3>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {BIT_OPS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setBitOp(candidate.id)}
              aria-pressed={bitOp === candidate.id}
              title={candidate.label}
              className={cx(
                "rounded-full border px-3 py-1.5 font-mono text-[11px]",
                bitOp === candidate.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {candidate.symbol} {candidate.label}
            </button>
          ))}
        </div>

        <label
          htmlFor="calc-base-operand"
          className="mt-3 block font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          {op.unary ? `${op.label} takes no second value` : op.id.startsWith("sh") ? "Shift by" : "With"}
        </label>
        <input
          id="calc-base-operand"
          type="text"
          value={operandText}
          onChange={(e) => setOperandText(e.target.value)}
          disabled={op.unary}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-40"
        />

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Result</p>
        {outcome === null ? (
          <p className="text-[13px] text-ink-soft">
            Needs a value on both sides, in base {base}.
          </p>
        ) : (
          <dl className="m-0 mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BASES.map((candidate) => (
              <div key={candidate} className="min-w-0">
                <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
                  {BASE_LABELS[candidate]}
                </dt>
                <dd className="m-0 truncate font-mono text-[13px] font-bold tabular-nums">
                  {inBase(outcome, candidate)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {outcome !== null && (
          <button
            type="button"
            onClick={() => put(outcome)}
            className="mt-3 rounded-full border border-border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft hover:border-accent hover:text-accent"
          >
            Use as the value
          </button>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-ink-soft">
        Everything here is computed in whole numbers of arbitrary size and then masked to the width
        you chose, which is why a 64-bit AND is exact.{" "}
        <strong className="font-semibold">
          JavaScript&rsquo;s own bitwise operators cannot do this
        </strong>{" "}
        — they coerce to 32-bit signed first, so <span className="font-mono text-[11px]">
          0xffffffff | 0
        </span>{" "}
        is &minus;1 there and anything wider is truncated outright. Shifts lose the bits that leave
        the width, as the hardware does.
      </p>
    </div>
  );
}

/** Split a flat bit array into rows of `size` — bytes, as they are read. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
