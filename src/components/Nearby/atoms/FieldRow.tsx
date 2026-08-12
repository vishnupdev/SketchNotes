import { cx } from "@/lib/utils";

/**
 * One label/value line of a spec sheet. The label can wrap; the value keeps its
 * own line on a phone and moves alongside from ~30rem, so a long firmware
 * string never squeezes its label to one character per line.
 */
export function FieldRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-1.5 last:border-b-0 min-[480px]:flex-row min-[480px]:items-baseline min-[480px]:justify-between min-[480px]:gap-4">
      <dt className="text-[12px] font-medium text-ink-soft">{label}</dt>
      <dd
        className={cx(
          "min-w-0 wrap-break-word text-[12.5px] font-semibold min-[480px]:text-right",
          mono && "font-mono text-[11.5px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
