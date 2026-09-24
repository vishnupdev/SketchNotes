"use client";

import { useEffect, useState } from "react";
import { useSpecsStore } from "@/store/useSpecsStore";
import { useProduct } from "@/hooks/useSpecs";
import { confidenceOf, scoreProduct, UNSCORED_REASON } from "@/lib/Specs/score";
import { REVIEW_SITES, regionById, storeQuery, storesFor } from "@/lib/Specs/stores";
import { ScoreDial } from "@/components/Specs/atoms/ScoreDial";
import { StarPicker } from "@/components/Specs/atoms/StarPicker";
import { AxisBar } from "@/components/Specs/molecules/AxisBar";
import { HowScored } from "@/components/Specs/organisms/HowScored";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { StoreRow } from "@/components/Specs/molecules/StoreRow";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";

/**
 * The rating tab: this app's score of the specification, and the reader's own
 * score of the product.
 *
 * They are two different claims and are kept visibly apart. The dial measures
 * what the manufacturer put on the sheet, against bands published in
 * `lib/Specs/score.ts`; the stars are what one person thought, and never leave
 * the device. Merging them into a single number would produce something that
 * looks authoritative and means nothing.
 *
 * The confidence line sits *above* the dial rather than below it, because a
 * score computed from two measures out of five has to be read as a sketch, and
 * a caveat placed under a large number is a caveat nobody reads.
 */
export function RatingPanel() {
  const openTitle = useSpecsStore((s) => s.openTitle);
  const setTab = useSpecsStore((s) => s.setTab);
  const ratings = useSpecsStore((s) => s.ratings);
  const rate = useSpecsStore((s) => s.rate);
  const clearRating = useSpecsStore((s) => s.clearRating);
  const regionId = useSpecsStore((s) => s.region);

  const { data: product, isPending } = useProduct(openTitle);
  const saved = openTitle ? ratings[openTitle] : undefined;

  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");

  // Adopt the saved rating when the open product changes. Keyed on the title
  // rather than on the rating object: re-running whenever the store's ratings
  // map changes would overwrite what is being typed, with what was last saved,
  // on every keystroke that saves.
  useEffect(() => {
    const existing = openTitle ? useSpecsStore.getState().ratings[openTitle] : undefined;
    setStars(existing?.stars ?? 0);
    setNote(existing?.note ?? "");
  }, [openTitle]);

  if (!openTitle) {
    return (
      <PanelNote
        title="Nothing to rate yet"
        action={
          <button
            type="button"
            onClick={() => setTab("find")}
            className="tint h-8 rounded-[10px] border border-border px-3 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Go to Find
          </button>
        }
      >
        Open a product and this tab scores its specification measure by measure — and gives you
        somewhere to record what you thought of it yourself.
      </PanelNote>
    );
  }

  if (isPending || !product) {
    return <PanelNote title="Reading the sheet…">The score is computed from it once it lands.</PanelNote>;
  }

  const score = scoreProduct(product.measures, product.category);
  const confidence = confidenceOf(score);
  const unscored = UNSCORED_REASON[product.category];

  const region = regionById(regionId);
  const term = storeQuery(product.name, product.maker);
  // The shops that sell it, then the places people talk about owning it. Capped
  // at four shops: this is a reading list, not the buying list on the Prices
  // tab, and the comparison sites there have no reviews of their own to offer.
  const reviewLinks = [...storesFor(region).slice(0, 4), ...REVIEW_SITES];

  const dirty = (saved?.stars ?? 0) !== stars || (saved?.note ?? "") !== note;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Spec score — {product.categoryLabel.toLowerCase()}
        </h3>

        {score.total === 0 ? (
          <PanelNote title="Not scored, on purpose">
            {unscored ??
              "This app has no published bands for this kind of product, so it is showing you the specifications and leaving the judgement to you."}
          </PanelNote>
        ) : (
          <div className="rounded-[14px] border border-border bg-panel p-4">
            <p className="text-[12px] leading-relaxed text-ink-soft">{confidence.note}</p>

            <div className="mt-3 flex flex-wrap items-center gap-5">
              <ScoreDial
                score={score.overall}
                band={score.band}
                label={`Spec score for the ${product.name}`}
              />
              <p className="min-w-[13rem] flex-1 text-[12px] leading-relaxed text-ink-soft">
                Each measure below is placed on a fixed scale for a {product.categoryLabel.toLowerCase()},
                and the ones this sheet answers are averaged by weight. It measures{" "}
                <b className="font-semibold text-text">what the maker claims</b>, not what the thing
                is like to own — no review, no testing, no opinion. Anything the sheet leaves out
                scores nothing rather than zero.
              </p>
            </div>

            <ul className="mt-2">
              {score.axes.map((axis) => (
                <AxisBar key={axis.id} axis={axis} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <HowScored category={product.category} categoryLabel={product.categoryLabel} />

      <section className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          What buyers say
        </h3>

        <div className="rounded-[14px] border border-border bg-panel p-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            The third answer, and the one this app cannot compute: what people who actually bought
            it think. No shop publishes its star average without a registered key, so rather than
            invent a number, these open the reviews where they are written.{" "}
            <b className="font-semibold text-text">Read two kinds.</b> A shop&rsquo;s reviews are
            from verified buyers but skew to the first fortnight; owners a year in, and reviewers
            testing for a living, tell you the things a spec sheet and a launch review both miss.
          </p>
        </div>

        <ul className="rounded-[14px] border border-border bg-panel px-2">
          {reviewLinks.map((site) => (
            <StoreRow
              key={site.id}
              name={site.name}
              note={site.note}
              href={site.search(term)}
              action="read reviews"
            />
          ))}
        </ul>
        <p className="text-[11px] leading-snug text-ink-soft">
          Searching for <b className="font-semibold text-text">“{term}”</b>. The shop rows follow
          your country choice on the Prices tab — {region.name} right now.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Your own rating
        </h3>

        <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            What the numbers can’t say. Kept in this browser, never sent anywhere, and shown beside
            the spec score rather than mixed into it.
          </p>

          <StarPicker
            value={stars}
            onChange={setStars}
            label={`Your rating of the ${product.name}`}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="specs-note"
              className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
            >
              Note
            </label>
            <textarea
              id="specs-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 600))}
              rows={3}
              placeholder="Why you rated it that — what the spec sheet doesn't tell you."
              className="scroll-slim w-full resize-y rounded-[10px] border border-border bg-paper px-3 py-2 text-[13px] leading-relaxed focus:border-accent focus:outline-none"
            />
            <p className="text-right font-mono text-[10px] text-ink-soft">{note.length} / 600</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              onClick={() => rate({ title: product.title, name: product.name, stars, note })}
              disabled={stars === 0 || !dirty}
            >
              {saved ? "Update rating" : "Save rating"}
            </PrimaryButton>

            {saved && (
              <button
                type="button"
                onClick={() => {
                  clearRating(product.title);
                  setStars(0);
                  setNote("");
                }}
                className="tint h-9 rounded-[10px] border border-border px-3 text-[12px] font-semibold hover:border-accent hover:text-accent"
              >
                Remove
              </button>
            )}

            {saved && !dirty && (
              <span className="text-[11px] text-ink-soft">
                Saved <time dateTime={saved.at}>{new Date(saved.at).toLocaleString()}</time>.
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
