import { cx } from "@/lib/utils";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

/** Round, tappable completion toggle. Accent-filled when checked. */
export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cx(
        "grid size-[22px] flex-none place-items-center rounded-full border-2 transition-colors",
        checked
          ? "border-success bg-success text-white"
          : "border-border text-transparent hover:border-accent",
        className,
      )}
    >
      <CheckIcon size={13} />
    </button>
  );
}
