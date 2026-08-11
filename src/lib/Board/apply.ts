import { KIND_BY_TYPE } from "./catalog";
import { clampText, newItem, newSection } from "./board-api";
import { describe } from "./commands";
import { dayLabel } from "./days";
import type { ApplyResult, BoardCommand, BoardSection } from "./types";

/**
 * Apply one resolved command to a board.
 *
 * Pure: it returns a fresh array and never mutates its input, which is what lets
 * the caller keep the previous array as an undo snapshot for free. Every branch
 * also returns the sentence shown back to the user, because only this layer knows
 * the *outcome* ("Water is at 6 of 8") — the parser only knows the intent.
 *
 * `undo` and `help` are handled by the caller (they aren't board edits) and are
 * treated as no-ops here so the switch stays exhaustive.
 */
/**
 * Keep section titles distinct, so a later reference ("rename note to X")
 * resolves to exactly one card. Done here rather than in the parser so *every*
 * way of adding a section — typed or from the add bar — gets it.
 */
function uniqueTitle(sections: BoardSection[], title: string): string {
  const taken = new Set(sections.map((s) => s.title.toLowerCase()));
  if (!taken.has(title.toLowerCase())) return title;
  for (let n = 2; n < 100; n++) if (!taken.has(`${title} ${n}`.toLowerCase())) return `${title} ${n}`;
  return title;
}

export function applyCommand(sections: BoardSection[], command: BoardCommand): ApplyResult {
  const now = Date.now();

  /** Replace one section, stamping `updatedAt`. */
  const patch = (id: string, fn: (s: BoardSection) => BoardSection): BoardSection[] =>
    sections.map((s) => (s.id === id ? { ...fn(s), updatedAt: now } : s));

  const at = (id: string) => sections.find((s) => s.id === id);
  const nothing = (message: string): ApplyResult => ({ sections: null, message, undoable: false });

  switch (command.kind) {
    case "add": {
      const section = newSection(command.type, uniqueTitle(sections, command.title));
      if (command.goal != null) section.goal = command.goal;
      return {
        sections: [...sections, section],
        message:
          `Added ${describe(section)}${section.goal ? ` with a goal of ${section.goal}` : ""}.` +
          // Say so when the type was a guess, and name the way to change it.
          (command.inferred
            ? ` Type guessed — say “turn ${section.title.toLowerCase()} into a checklist” to change it.`
            : ""),
        focusId: section.id,
        undoable: true,
      };
    }

    case "remove": {
      const s = at(command.id);
      if (!s) return nothing("That section is already gone.");
      return {
        sections: sections.filter((x) => x.id !== command.id),
        message: `Removed ${describe(s)}.`,
        undoable: true,
      };
    }

    case "clear":
      return {
        sections: [],
        message: `Cleared the board — ${sections.length} section${sections.length === 1 ? "" : "s"} removed.`,
        undoable: true,
      };

    case "rename": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      if (s.title === command.title) return nothing(`It's already called “${command.title}”.`);
      // Uniqueness is checked against the *other* sections: renaming onto a name
      // already in use would leave two cards that no later prompt could tell
      // apart, which is worse than a suffix.
      const title = uniqueTitle(
        sections.filter((x) => x.id !== command.id),
        command.title,
      );
      return {
        sections: patch(command.id, (x) => ({ ...x, title })),
        message:
          title === command.title
            ? `Renamed “${s.title}” to “${title}”.`
            : `Renamed “${s.title}” to “${title}” — “${command.title}” was taken.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "retype": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      const label = KIND_BY_TYPE[command.type].label.toLowerCase();
      return {
        sections: patch(command.id, (x) => ({ ...x, type: command.type })),
        // Nothing is deleted on a type change — the fields the new type doesn't
        // show are kept, so switching back restores the old content intact.
        message: `“${s.title}” is now a ${label}. Anything the ${label} doesn't show is kept, so you can switch back.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "move": {
      const from = sections.findIndex((s) => s.id === command.id);
      if (from === -1) return nothing("That section is gone.");
      const to =
        command.to === "top"
          ? 0
          : command.to === "bottom"
            ? sections.length - 1
            : Math.min(sections.length - 1, Math.max(0, from + (command.to === "up" ? -1 : 1)));
      if (to === from) {
        return nothing(`“${sections[from].title}” is already ${command.to === "up" ? "first" : command.to === "down" ? "last" : command.to}.`);
      }
      const next = sections.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return {
        sections: next,
        message: `Moved “${moved.title}” to position ${to + 1} of ${next.length}.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "collapse": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      if (s.collapsed === command.collapsed) {
        return nothing(`“${s.title}” is already ${command.collapsed ? "collapsed" : "open"}.`);
      }
      return {
        sections: patch(command.id, (x) => ({ ...x, collapsed: command.collapsed })),
        message: `${command.collapsed ? "Collapsed" : "Expanded"} “${s.title}”.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "resize": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      if (s.wide === command.wide) {
        return nothing(`“${s.title}” is already ${command.wide ? "wide" : "narrow"}.`);
      }
      return {
        sections: patch(command.id, (x) => ({ ...x, wide: command.wide })),
        message: `“${s.title}” is now ${command.wide ? "wide" : "narrow"}.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "setNum": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      const words = { value: "count", goal: "goal", step: "step" } as const;
      return {
        sections: patch(command.id, (x) => ({ ...x, [command.field]: command.value })),
        message:
          command.field === "goal" && command.value === 0
            ? `Removed the goal from “${s.title}”.`
            : `“${s.title}” ${words[command.field]} is now ${command.value}.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "setUnit": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      return {
        sections: patch(command.id, (x) => ({ ...x, unit: command.unit })),
        message: `“${s.title}” now counts ${command.unit}.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "bump": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      const value = Math.max(0, s.value + command.by);
      if (value === s.value) return nothing(`“${s.title}” is already at ${s.value}.`);
      return {
        sections: patch(command.id, (x) => ({ ...x, value })),
        message: `“${s.title}” is at ${value}${s.goal ? ` of ${s.goal}` : ""}${s.unit ? ` ${s.unit}` : ""}.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "addItem": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      if (s.type === "note") {
        // A note has no rows, so a row becomes a new line of the body.
        const text = clampText(s.text ? `${s.text}\n${command.text}` : command.text);
        return {
          sections: patch(command.id, (x) => ({ ...x, text })),
          message: `Added a line to “${s.title}”.`,
          focusId: command.id,
          undoable: true,
        };
      }
      const item = newItem(command.text, command.url);
      return {
        sections: patch(command.id, (x) => ({ ...x, items: [...x.items, item] })),
        message: `Added “${item.text}” to “${s.title}”.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "tick": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      if (s.type === "habit") {
        const has = s.done.includes(command.itemId);
        if (has === command.done) {
          return nothing(
            `${dayLabel(command.itemId)} is already ${command.done ? "ticked" : "clear"} on “${s.title}”.`,
          );
        }
        const nextDays = command.done
          ? [...s.done, command.itemId]
          : s.done.filter((d) => d !== command.itemId);
        return {
          sections: patch(command.id, (x) => ({ ...x, done: nextDays })),
          message: `${command.done ? "Ticked" : "Cleared"} ${dayLabel(command.itemId)} on “${s.title}”.`,
          focusId: command.id,
          undoable: true,
        };
      }
      const item = s.items.find((i) => i.id === command.itemId);
      if (!item) return nothing("That row is gone.");
      if (item.done === command.done) {
        return nothing(`“${item.text}” is already ${command.done ? "checked" : "unchecked"}.`);
      }
      const left = s.items.filter((i) => (i.id === command.itemId ? !command.done : !i.done)).length;
      return {
        sections: patch(command.id, (x) => ({
          ...x,
          items: x.items.map((i) => (i.id === command.itemId ? { ...i, done: command.done } : i)),
        })),
        message: `${command.done ? "Checked" : "Unchecked"} “${item.text}” — ${left} left on “${s.title}”.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "removeItem": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      const item = s.items.find((i) => i.id === command.itemId);
      if (!item) return nothing("That row is gone.");
      return {
        sections: patch(command.id, (x) => ({
          ...x,
          items: x.items.filter((i) => i.id !== command.itemId),
        })),
        message: `Removed “${item.text}” from “${s.title}”.`,
        focusId: command.id,
        undoable: true,
      };
    }

    case "reset": {
      const s = at(command.id);
      if (!s) return nothing("That section is gone.");
      const wording: Record<BoardSection["type"], string> = {
        note: "Emptied",
        checklist: "Unchecked everything on",
        counter: "Reset",
        links: "Emptied",
        habit: "Cleared every day on",
      };
      return {
        sections: patch(command.id, (x) => {
          switch (x.type) {
            case "note":
              return { ...x, text: "" };
            case "checklist":
              return { ...x, items: x.items.map((i) => ({ ...i, done: false })) };
            case "counter":
              return { ...x, value: 0 };
            case "links":
              return { ...x, items: [] };
            case "habit":
              return { ...x, done: [] };
          }
        }),
        message: `${wording[s.type]} “${s.title}”.`,
        focusId: command.id,
        undoable: true,
      };
    }

    // Handled by the caller — listed so the switch stays exhaustive.
    case "undo":
    case "help":
      return nothing("");
  }
}
