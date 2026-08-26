"use client";

import { decodeJwt } from "@/lib/TextKit/jwt";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx } from "@/lib/utils";

/**
 * The decoded view of a JWT.
 *
 * Structured rather than "here is the JSON", because the questions people open a
 * token for are ordered: has it expired, who issued it, what is it allowed to do.
 * So the expiry verdict is first and largest, the claims are listed with what each
 * registered one *means*, and the raw header and payload are underneath for when
 * the specific bytes matter.
 *
 * The "not verified" note is not a disclaimer bolted on — it is the most important
 * thing on screen. A decoded token proves nothing about its authenticity, and a
 * tool that presented one as trustworthy would be actively harmful.
 */
export function JwtView({ token }: { token: string }) {
  const result = decodeJwt(token);

  if (!result.ok) {
    return (
      <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
        {result.error}
      </p>
    );
  }

  const { parts } = result;

  return (
    <div className="flex flex-col gap-3">
      {/* Signature status, always, before anything else. */}
      <p className="rounded-[10px] border border-border bg-panel px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
        <b className="font-semibold text-text">Decoded, not verified.</b> Checking the signature
        needs the issuer&rsquo;s key, which this app does not have and would not ask you for. Treat
        everything below as claims the token <i>makes</i>, not facts.
        {parts.algorithm && (
          <>
            {" "}
            The header says the algorithm is{" "}
            <b className="font-mono font-semibold text-text">{parts.algorithm}</b>
            {parts.algorithm.toLowerCase() === "none" && (
              <>
                {" "}
                — an unsecured token, with <b className="text-danger">no signature at all</b>
              </>
            )}
            .
          </>
        )}
      </p>

      {(parts.expiry || parts.notYetValid) && (
        <div className="flex flex-col gap-1.5">
          {parts.expiry && (
            <p
              className={cx(
                "rounded-[10px] border px-3 py-2.5 text-[13.5px] font-semibold",
                parts.expiry.expired
                  ? "border-danger/50 bg-panel text-danger"
                  : "border-accent/45 bg-accent-soft text-accent",
              )}
            >
              {parts.expiry.note}
            </p>
          )}
          {parts.notYetValid && (
            <p className="rounded-[10px] border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold">
              {parts.notYetValid}
            </p>
          )}
        </div>
      )}

      {parts.claims.length > 0 && (
        <section aria-labelledby="jwt-claims">
          <h3
            id="jwt-claims"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Claims
          </h3>
          <dl className="mt-1 rounded-[10px] border border-border bg-panel px-3 py-1">
            {parts.claims.map((claim) => (
              <div key={claim.name} className="border-b border-border py-2 last:border-b-0">
                <dt className="font-mono text-[11.5px] font-semibold uppercase tracking-[.06em] text-accent">
                  {claim.name}
                </dt>
                <dd className="mt-0.5 break-all font-mono text-[12px]">{claim.value}</dd>
                {claim.note && (
                  <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{claim.note}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="grid gap-3 min-[640px]:grid-cols-2">
        <TextField label="Header" value={parts.header} rows={6} counts={false} />
        <TextField label="Payload" value={parts.payload} rows={6} counts={false} />
      </div>

      <TextField
        label="Signature (not checked)"
        value={parts.signature || "— this token has no signature —"}
        rows={2}
        counts={false}
      />
    </div>
  );
}
