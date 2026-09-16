"use client";

import { useSpecsStore } from "@/store/useSpecsStore";
import { ExternalLinkIcon, PinIcon, PinOffIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";
import type { ProductRecord } from "@/lib/Specs/types";

/** "14 Mar 2024" from whatever shape the source stated a date in. */
function readableDate(raw: string): string {
  // The infobox date templates reduce to "2023-09-22"; anything else is already
  // prose ("2017–present", "June 5, 2025") and is better left as written.
  const iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(raw.trim());
  if (!iso) return raw;

  const [, year, month, day] = iso;
  const date = new Date(Number(year), Number(month) - 1, Number(day ?? 1));
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    ...(day ? { day: "numeric" } : {}),
  });
}

/**
 * The head of a spec sheet: the picture, the name, who made it and when, and
 * the link back to where all of it came from.
 *
 * The source link is not a footnote here — it is the reason the rest of the
 * sheet can be trusted, so it sits in the header rather than at the bottom. The
 * "read at" stamp beside it says how old this copy is, which matters because
 * these sheets are cached for hours.
 */
export function ProductHead({ product }: { product: ProductRecord }) {
  const shortlist = useSpecsStore((s) => s.shortlist);
  const toggleShortlist = useSpecsStore((s) => s.toggleShortlist);
  const kept = shortlist.some((s) => s.title === product.title);

  const facts = [
    product.maker && { label: "Made by", value: product.maker },
    product.released && { label: "Released", value: readableDate(product.released) },
    { label: "Kind", value: product.categoryLabel },
  ].filter((f): f is { label: string; value: string } => !!f);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        {product.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image}
            alt={`${product.name}`}
            width={104}
            height={104}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="size-[104px] flex-none rounded-[14px] border border-border bg-panel object-contain p-1.5"
          />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">{product.name}</h2>
          {product.description && (
            <p className="mt-1 font-serif text-[14px] italic text-ink-soft">{product.description}</p>
          )}

          <button
            type="button"
            onClick={() =>
              toggleShortlist({
                title: product.title,
                name: product.name,
                description: product.description,
                image: product.image,
              })
            }
            aria-pressed={kept}
            data-print="hide"
            className={cx(
              "mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-3 text-[12px] font-semibold",
              kept
                ? "border-accent bg-accent text-on-accent"
                : "tint border-border hover:border-accent hover:text-accent",
            )}
            style={{ transition: "var(--fx)" }}
          >
            {kept ? <PinOffIcon size={14} /> : <PinIcon size={14} />}
            {kept ? "On your shortlist" : "Add to shortlist"}
          </button>

          <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="font-mono text-[9px] uppercase tracking-[.14em] text-ink-soft">
                  {fact.label}
                </dt>
                <dd className="truncate text-[12.5px] font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {product.summary && (
        <p className="text-[13px] leading-relaxed text-text">{product.summary}</p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
        >
          <ExternalLinkIcon size={13} aria-hidden="true" />
          Read the source article
        </a>
        <span aria-hidden="true">·</span>
        <span>
          Every figure below is quoted from it. Read{" "}
          <time dateTime={product.readAt}>{new Date(product.readAt).toLocaleString()}</time>.
        </span>
      </p>
    </header>
  );
}
