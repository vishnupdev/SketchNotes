import { cx } from "@/lib/utils";
import type { TodoFilter } from "@/lib/Todos/types";
import { SearchIcon } from "@/components/SketchNotes/atoms/icons";

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
];

interface FilterBarProps {
  filter: TodoFilter;
  query: string;
  onFilter: (filter: TodoFilter) => void;
  onQuery: (query: string) => void;
}

/** Status filter chips plus a search field. */
export function FilterBar({ filter, query, onFilter, onQuery }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
      <div className="inline-flex gap-1 rounded-xl border border-border bg-panel p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            aria-current={filter === f.id}
            className={cx(
              "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              filter === f.id ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative min-[520px]:w-56">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
          <SearchIcon size={16} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search tasks…"
          className="h-9 w-full rounded-xl border border-border bg-panel pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-soft focus:border-accent"
        />
      </div>
    </div>
  );
}
