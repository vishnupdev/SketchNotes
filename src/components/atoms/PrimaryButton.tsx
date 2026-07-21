import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

/** Accent-filled primary action button (Download, New note). */
export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PrimaryButton({ className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cx(
          "flex h-9 flex-none items-center gap-1.5 rounded-[10px] bg-accent px-3",
          "font-semibold text-white hover:brightness-110",
          className,
        )}
        {...rest}
      />
    );
  },
);
