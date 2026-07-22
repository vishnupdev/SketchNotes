import { cx } from "@/lib/utils";
import type { Task } from "@/lib/Todos/types";
import { dueLabel } from "@/lib/Todos/dates";
import { Checkbox } from "@/components/Todos/atoms/Checkbox";
import { PriorityFlag } from "@/components/Todos/atoms/PriorityFlag";
import { CalendarIcon, PenIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

interface TaskItemProps {
  task: Task;
  /** "Now" reference for relative due labels + overdue detection. */
  now: number;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

/** A single task row: toggle, title/notes, due + priority meta, and actions. */
export function TaskItem({ task, now, onToggle, onEdit, onDelete }: TaskItemProps) {
  const overdue = !task.completed && task.due != null && task.due < now;

  return (
    <li
      className={cx(
        "group flex items-start gap-3 rounded-xl border border-border bg-panel px-3.5 py-3 transition-colors",
        "hover:border-accent/60",
        task.completed && "opacity-65",
      )}
    >
      <Checkbox
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        label={task.completed ? `Mark "${task.title}" active` : `Complete "${task.title}"`}
        className="mt-0.5"
      />

      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={cx(
            "block truncate text-[14.5px] font-semibold leading-snug",
            task.completed && "line-through",
          )}
        >
          {task.title}
        </span>

        {task.notes && (
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">{task.notes}</span>
        )}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {task.due != null && (
            <span
              className={cx(
                "inline-flex items-center gap-1 text-[12px] font-medium",
                overdue ? "text-danger" : "text-ink-soft",
              )}
            >
              <CalendarIcon size={13} />
              {dueLabel(task.due, now)}
              {overdue && " · overdue"}
            </span>
          )}
          <PriorityFlag priority={task.priority} showLabel />
        </span>
      </button>

      {/* Actions: always visible on touch/mobile, hover-revealed on desktop. */}
      <div className="flex flex-none items-center gap-0.5 opacity-100 transition-opacity min-[640px]:opacity-0 min-[640px]:focus-within:opacity-100 min-[640px]:group-hover:opacity-100">
        <button
          type="button"
          aria-label={`Edit "${task.title}"`}
          onClick={() => onEdit(task)}
          className="tint grid size-8 place-items-center rounded-lg text-ink-soft hover:text-text"
        >
          <PenIcon size={16} />
        </button>
        <button
          type="button"
          aria-label={`Delete "${task.title}"`}
          onClick={() => onDelete(task.id)}
          className="tint grid size-8 place-items-center rounded-lg text-ink-soft hover:text-danger"
        >
          <TrashSmallIcon size={16} />
        </button>
      </div>
    </li>
  );
}
