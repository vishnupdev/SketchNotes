import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { BTN } from "@/components/WatchParty/ui";

/**
 * A file picker dressed as a button. The real input stays in the page (visually
 * hidden, not `display: none`), so it is still reached by Tab and announced as
 * what it is; the label draws the focus ring for it.
 */
export function FileButton({
  children,
  accept,
  multiple = false,
  onFiles,
  className,
  base = BTN,
}: {
  children: ReactNode;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  base?: string;
}) {
  return (
    <label className={cx(base, "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent", className)}>
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
