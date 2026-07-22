import { cx } from "@/lib/utils";
import { PRIORITY_LABEL, type Priority } from "@/lib/Todos/types";
import { FlagIcon } from "@/components/SketchNotes/atoms/icons";

/** Theme token used for each priority's colour. */
const TONE: Record<Priority, string> = {
  high: "text-prio-high",
  medium: "text-prio-med",
  low: "text-prio-low",
};

/** Small coloured priority indicator — a flag with an optional text label. */
export function PriorityFlag({
  priority,
  showLabel = false,
  size = 14,
  className,
}: {
  priority: Priority;
  showLabel?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-flex items-center gap-1", TONE[priority], className)}
      title={`${PRIORITY_LABEL[priority]} priority`}
    >
      <FlagIcon size={size} />
      {showLabel && (
        <span className="text-[12px] font-semibold">{PRIORITY_LABEL[priority]}</span>
      )}
    </span>
  );
}
