import { cx } from "@/lib/utils";

/** A labelled on/off switch — the whole row is the control. */
export function Switch({
  label,
  detail,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-panel p-3 text-left transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{label}</span>
        {detail && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{detail}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          "relative mt-0.5 h-6 w-10 flex-none rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-border bg-paper",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 size-[18px] rounded-full shadow-sm transition-[left]",
            checked ? "left-[18px] bg-on-accent" : "left-0.5 bg-ink-soft",
          )}
        />
      </span>
    </button>
  );
}
