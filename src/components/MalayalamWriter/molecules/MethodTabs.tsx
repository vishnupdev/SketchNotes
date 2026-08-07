"use client";

import { KeyboardIcon, PenIcon, TextIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

export type InputMethod = "manglish" | "keyboard" | "handwriting";

const TABS: BottomNavItem<InputMethod>[] = [
  { id: "manglish", label: "Manglish", hint: "Type it the way it sounds", icon: <TextIcon size={19} /> },
  { id: "keyboard", label: "Keyboard", hint: "Tap the Malayalam letters", icon: <KeyboardIcon size={19} /> },
  { id: "handwriting", label: "Write", hint: "Draw the letters by hand", icon: <PenIcon size={19} /> },
];

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
