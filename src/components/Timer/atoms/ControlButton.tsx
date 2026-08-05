import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "neutral" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** Accessible label; also the tooltip. */
  label: string;
  variant?: Variant;
  size?: Size;
}

// Each variant carries exactly one hover utility (they own the press feedback,
// so pairing two would leave their `:active` transforms fighting).
const VARIANTS: Record<Variant, string> = {
  primary: "hover-glow bg-accent text-white shadow-panel",
  neutral: "hover-pop border border-border bg-panel hover:border-accent hover:text-accent",
  ghost: "hover-pop text-ink-soft hover:bg-accent-soft hover:text-accent",
  danger:
    "hover-pop border border-border bg-panel text-ink-soft hover:border-danger hover:text-danger",
};

const SIZES: Record<Size, string> = {
  sm: "size-9",
  md: "size-11",
  lg: "size-16",
};

/** Round, icon-only action button used across all timer controls. */
export function ControlButton({
  icon,
  label,
  variant = "neutral",
  size = "md",
  className,
  ...rest
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "grid flex-none place-items-center rounded-full disabled:pointer-events-none disabled:opacity-40",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
