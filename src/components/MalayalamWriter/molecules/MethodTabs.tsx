"use client";

import { KeyboardIcon, PenIcon, TextIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

export type InputMethod = "manglish" | "keyboard" | "handwriting";

const TABS: BottomNavItem<InputMethod>[] = [
  { id: "manglish", label: "Manglish", hint: "Type it the way it sounds", icon: <TextIcon size={19} /> },
  { id: "keyboard", label: "Keyboard", hint: "Tap the Malayalam letters", icon: <KeyboardIcon size={19} /> },
  { id: "handwriting", label: "Write", hint: "Draw the letters by hand", icon: <PenIcon size={19} /> },
];

/**
 * The tab ids in bar order. Derived from TABS rather than written out again, so
 * the direction a panel animates in can never disagree with the order the tabs
 * are actually shown in.
 */
export const INPUT_METHOD_ORDER = TABS.map((t) => t.id);

interface MethodTabsProps {
  method: InputMethod;
  onMethod: (method: InputMethod) => void;
}

/** The three Malayalam input methods, as the floating bottom bar. */
export function MethodTabs({ method, onMethod }: MethodTabsProps) {
  return (
    <BottomNav label="Input method" items={TABS} value={method} onChange={onMethod} maxWidth={380} />
  );
}
