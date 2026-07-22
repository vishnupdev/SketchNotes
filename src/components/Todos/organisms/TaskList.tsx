"use client";

import type { ReactNode } from "react";
import type { Task } from "@/lib/Todos/types";
import { sortTasks } from "@/lib/Todos/selectors";
import { useTodoMutations } from "@/hooks/useTodos";
import { useTodoStore } from "@/store/useTodoStore";
import { TaskItem } from "@/components/Todos/molecules/TaskItem";
import { InboxIcon } from "@/components/SketchNotes/atoms/icons";

interface TaskListProps {
  tasks: Task[];
  now: number;
  /** Shown when there are no tasks to render. */
  empty?: ReactNode;
  /** Skip the default ordering (caller pre-sorted). */
  presorted?: boolean;
}

/** Renders a sorted list of tasks with shared toggle/edit/delete wiring. */
export function TaskList({ tasks, now, empty, presorted }: TaskListProps) {
  const { toggle, remove } = useTodoMutations();
  const openEditor = useTodoStore((s) => s.openEditor);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center text-ink-soft">
        <InboxIcon size={30} />
        <p className="text-[13px]">{empty ?? "Nothing here yet."}</p>
      </div>
    );
  }

  const ordered = presorted ? tasks : sortTasks(tasks);

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          now={now}
          onToggle={(id) => toggle.mutate(id)}
          onEdit={(t) => openEditor({ taskId: t.id })}
          onDelete={(id) => remove.mutate(id)}
        />
      ))}
    </ul>
  );
}
