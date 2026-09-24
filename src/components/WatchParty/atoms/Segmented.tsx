import { btn } from "@/components/WatchParty/ui";

/**
 * A row of pressed/unpressed buttons for picking one of a few settings —
 * Stereo · Mono · Left · Right. A labelled group of toggle buttons rather than
 * a tab list: nothing here switches a view.
 */
export function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === value}
          onClick={() => onChange(item.id)}
          className={btn(item.id === value, true)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
