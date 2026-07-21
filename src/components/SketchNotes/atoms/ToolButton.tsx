import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** 42×42 dock tool button with an accent active state. */
export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(
  function ToolButton({ active, className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cx(
          "grid size-[42px] flex-none place-items-center rounded-xl transition-colors",
          active
            ? "bg-accent text-white"
            : "text-dock-ink hover:bg-white/[.09] hover:text-[#e8eef2]",
          className,
        )}
        {...rest}
      />
    );
  },
);
