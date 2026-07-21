import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

/** 38×38 icon button used in the header and drawer. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cx(
          "tint grid size-[38px] flex-none place-items-center rounded-[10px] text-ink-soft",
          "hover:text-text disabled:pointer-events-none disabled:opacity-30",
          className,
        )}
        {...rest}
      />
    );
  },
);
