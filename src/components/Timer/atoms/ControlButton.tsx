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

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:brightness-110 shadow-panel",
  neutral: "border border-border bg-panel hover:border-accent hover:text-accent",
  ghost: "text-ink-soft hover:bg-accent-soft hover:text-accent",
  danger: "border border-border bg-panel text-ink-soft hover:border-danger hover:text-danger",
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
        "grid flex-none place-items-center rounded-full transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40",
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
