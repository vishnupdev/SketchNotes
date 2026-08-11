"use client";

import { useRef, useState } from "react";
import type { BoardActions } from "@/hooks/useBoard";
import { KIND_BY_TYPE, SECTION_KINDS } from "@/lib/Board/catalog";
import type { BoardSection, SectionType } from "@/lib/Board/types";
import { cx } from "@/lib/utils";
import { Popover } from "@/components/SketchNotes/atoms/Popover";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MoreIcon,
  RotateIcon,
  TrashSmallIcon,
  WidthIcon,
} from "@/components/SketchNotes/atoms/icons";
import { SectionGlyph } from "@/components/Board/atoms/SectionGlyph";
import { ChecklistBody } from "./ChecklistBody";
import { CounterBody } from "./CounterBody";
import { HabitBody } from "./HabitBody";
import { LinksBody } from "./LinksBody";
import { NoteBody } from "./NoteBody";

interface SectionCardProps {
  section: BoardSection;
  actions: BoardActions;
  /** Highlight briefly — the section a typed command just touched. */
  flash: boolean;
  /** Position in the board, for the move controls' labels. */
  index: number;
  total: number;
}

const BODIES: Record<SectionType, typeof NoteBody> = {
  note: NoteBody,
  checklist: ChecklistBody,
  counter: CounterBody,
  links: LinksBody,
  habit: HabitBody,
};

/**
 * One section on the board: the shared card chrome plus the body for its type.
 *
 * Everything the prompt can do to a section, this card's own controls can do too
 * — and they go through the same commands, so the two never drift apart. The
 * prompt is the fast path, not the only path: an app whose only affordance is a
 * text box is unusable for anyone who can't guess the phrasing.
 */
export function SectionCard({ section, actions, flash, index, total }: SectionCardProps) {
  const Body = BODIES[section.type];
  const kind = KIND_BY_TYPE[section.type];
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  /** Run a menu action and shut the menu. */
  const act = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <li
      data-board-section={section.id}
      className={cx("min-w-0", section.wide && "min-[560px]:col-span-2")}
    >
      <article
        aria-label={`${section.title} — ${kind.label}`}
        className={cx(
          "flex h-full flex-col rounded-2xl border bg-panel shadow-panel",
          flash ? "border-accent ring-2 ring-accent" : "border-border",
        )}
        style={{ transition: "var(--fx)" }}
      >
        <header className="flex items-center gap-2 px-3 pb-2 pt-3">
          <SectionGlyph type={section.type} tile />

          {/* The title is edited where it's read — no dialog, no edit mode. */}
          <input
            value={section.title}
            onChange={(e) => actions.writeSection(section.id, { title: e.target.value })}
            onBlur={(e) => {
              if (!e.target.value.trim()) actions.writeSection(section.id, { title: kind.defaultTitle });
            }}
            aria-label={`Rename ${section.title}`}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-[14.5px] font-bold tracking-[.1px] focus:border-border focus:bg-paper focus:outline-none"
          />

          <button
            type="button"
            onClick={() =>
              actions.dispatch({ kind: "collapse", id: section.id, collapsed: !section.collapsed })
            }
            aria-expanded={!section.collapsed}
            aria-label={`${section.collapsed ? "Expand" : "Collapse"} ${section.title}`}
            className="tint hover-pop grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {section.collapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
          </button>

          <button
            ref={menuRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Options for ${section.title}`}
            className="tint hover-pop grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <MoreIcon size={16} />
          </button>
        </header>

        {!section.collapsed && <div className="min-w-0 px-3 pb-3.5">
          <Body section={section} actions={actions} />
        </div>}
      </article>

      <Popover
        open={menuOpen}
        anchorRef={menuRef}
        onClose={close}
        placement="bottom"
        align="end"
        className="w-56"
      >
        <div role="menu" aria-label={`${section.title} options`} className="flex flex-col">
          <MenuRow
            onClick={act(() => actions.dispatch({ kind: "move", id: section.id, to: "up" }))}
            disabled={index === 0}
            icon={<ChevronUpIcon size={15} />}
            label="Move up"
          />
          <MenuRow
            onClick={act(() => actions.dispatch({ kind: "move", id: section.id, to: "down" }))}
            disabled={index === total - 1}
            icon={<ChevronDownIcon size={15} />}
            label="Move down"
          />
          <MenuRow
            onClick={act(() => actions.dispatch({ kind: "resize", id: section.id, wide: !section.wide }))}
            icon={<WidthIcon size={15} />}
            label={section.wide ? "Make narrow" : "Make wide"}
          />
          <MenuRow
            onClick={act(() => actions.dispatch({ kind: "reset", id: section.id }))}
            icon={<RotateIcon size={15} />}
            label="Reset contents"
          />
          <MenuRow
            onClick={act(() => actions.dispatch({ kind: "remove", id: section.id }))}
            icon={<TrashSmallIcon size={15} />}
            label="Remove section"
            danger
          />

          <p
            id={`retype-${section.id}`}
            className="mt-1 border-t border-border px-2.5 pb-1 pt-2 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft"
          >
            Change type
          </p>
          <div role="group" aria-labelledby={`retype-${section.id}`} className="flex gap-1 px-1.5 pb-1">
            {SECTION_KINDS.map((k) => (
              <button
                key={k.type}
                type="button"
                onClick={act(() => actions.dispatch({ kind: "retype", id: section.id, type: k.type }))}
                aria-pressed={k.type === section.type}
                title={`${k.label} — ${k.blurb}`}
                aria-label={`Change to ${k.label}`}
                className={cx(
                  "hover-pop grid flex-1 place-items-center rounded-lg border py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  k.type === section.type
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-ink-soft hover:border-accent hover:text-accent",
                )}
              >
                <SectionGlyph type={k.type} size={15} />
              </button>
            ))}
          </div>
        </div>
      </Popover>
    </li>
  );
}

interface MenuRowProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}

function MenuRow({ onClick, icon, label, disabled, danger }: MenuRowProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "tint flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        danger ? "text-danger" : "text-text",
      )}
    >
      <span className="flex-none text-ink-soft" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
