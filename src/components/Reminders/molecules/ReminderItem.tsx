import { cx } from "@/lib/utils";
import type { Reminder } from "@/lib/Reminders/types";
import { REPEAT_LABEL } from "@/lib/Reminders/types";
import { SOUNDS } from "@/lib/Reminders/sounds";
import { fireLabel, timeUntil } from "@/lib/Reminders/format";
import { BellIcon, ClockIcon, PenIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

interface ReminderItemProps {
  reminder: Reminder;
  now: number;
  onToggle: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

const soundName = (id: Reminder["sound"]) => SOUNDS.find((s) => s.id === id)?.name ?? id;

/** A reminder row: schedule, meta, enable switch, and actions. */
export function ReminderItem({ reminder, now, onToggle, onEdit, onDelete }: ReminderItemProps) {
  const done = reminder.repeat === "none" && reminder.firedAt != null;
  const upcoming = reminder.enabled && !done;

  return (
    <li
      className={cx(
        "group flex items-start gap-3 rounded-xl border border-border bg-panel px-3.5 py-3 transition-colors hover:border-accent/60",
        !reminder.enabled && "opacity-60",
      )}
    >
      <span
        className={cx(
          "mt-0.5 grid size-9 flex-none place-items-center rounded-full",
          upcoming ? "bg-accent-soft text-accent" : "bg-border text-ink-soft",
        )}
      >
        <BellIcon size={18} />
      </span>

      <button type="button" onClick={() => onEdit(reminder)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[14.5px] font-semibold leading-snug">
          {reminder.title}
        </span>
        {reminder.notes && (
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">{reminder.notes}</span>
        )}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1 font-medium">
            <ClockIcon size={13} />
            {fireLabel(reminder.fireAt, now)}
          </span>
          {upcoming && <span className="text-accent">{timeUntil(reminder.fireAt, now)}</span>}
          {done && <span className="text-success">Done</span>}
          {reminder.repeat !== "none" && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-accent">
              {REPEAT_LABEL[reminder.repeat]}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <BellIcon size={12} />
            {soundName(reminder.sound)}
          </span>
        </span>
      </button>

      <div className="flex flex-none flex-col items-end gap-1">
        {/* Enable / pause switch */}
        <button
          type="button"
          role="switch"
          aria-checked={reminder.enabled}
          aria-label={reminder.enabled ? "Pause reminder" : "Enable reminder"}
          onClick={() => onToggle(reminder.id)}
          className={cx(
            "relative h-5 w-9 flex-none rounded-full transition-colors",
            reminder.enabled ? "bg-accent" : "bg-border",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
              reminder.enabled ? "translate-x-[18px]" : "translate-x-0.5",
            )}
          />
        </button>
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity min-[640px]:opacity-0 min-[640px]:group-hover:opacity-100 min-[640px]:focus-within:opacity-100">
          <button
            type="button"
            aria-label={`Edit "${reminder.title}"`}
            onClick={() => onEdit(reminder)}
            className="tint grid size-8 place-items-center rounded-lg text-ink-soft hover:text-text"
          >
            <PenIcon size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete "${reminder.title}"`}
            onClick={() => onDelete(reminder.id)}
            className="tint grid size-8 place-items-center rounded-lg text-ink-soft hover:text-danger"
          >
            <TrashSmallIcon size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
