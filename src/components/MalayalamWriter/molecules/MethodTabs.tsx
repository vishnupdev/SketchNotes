import { cx } from "@/lib/utils";
import { KeyboardIcon, PenIcon, TextIcon } from "@/components/SketchNotes/atoms/icons";

export type InputMethod = "manglish" | "keyboard" | "handwriting";

const TABS: { id: InputMethod; label: string; icon: typeof TextIcon }[] = [
  { id: "manglish", label: "Manglish", icon: TextIcon },
  { id: "keyboard", label: "Keyboard", icon: KeyboardIcon },
  { id: "handwriting", label: "Write", icon: PenIcon },
];

interface MethodTabsProps {
  method: InputMethod;
  onMethod: (method: InputMethod) => void;
}

/** Segmented control switching between the three Malayalam input methods. */
export function MethodTabs({ method, onMethod }: MethodTabsProps) {
  return (
    <div className="inline-flex w-full gap-1 rounded-2xl border border-border bg-panel p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onMethod(id)}
          aria-current={method === id}
          className={cx(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
            method === id ? "bg-accent text-on-accent shadow-panel" : "text-ink-soft hover:text-text",
          )}
        >
          <Icon size={17} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
