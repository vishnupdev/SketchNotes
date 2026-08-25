"use client";

import type { TextTool } from "@/store/useTextKitStore";
import {
  CopyIcon,
  DiceIcon,
  HashIcon,
  SwapIcon,
  TextIcon,
  WidthIcon,
} from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<TextTool>[] = [
  {
    id: "transform",
    label: "Text",
    hint: "Case, lines and counts",
    icon: <TextIcon size={19} />,
    controls: "text-panel-transform",
  },
  {
    id: "encode",
    label: "Encode",
    hint: "Base64, URL, HTML entities, JSON strings",
    icon: <SwapIcon size={19} />,
    controls: "text-panel-encode",
  },
  {
    id: "json",
    label: "JSON",
    hint: "Format, minify and find the error",
    icon: <WidthIcon size={19} />,
    controls: "text-panel-json",
  },
  {
    id: "diff",
    label: "Compare",
    hint: "Line-by-line differences",
    icon: <CopyIcon size={19} />,
    controls: "text-panel-diff",
  },
  {
    id: "regex",
    label: "Regex",
    hint: "Test a pattern and preview a replacement",
    icon: <DiceIcon size={19} />,
    controls: "text-panel-regex",
  },
  {
    id: "hash",
    label: "Hash",
    hint: "SHA and CRC of text or a file",
    icon: <HashIcon size={19} />,
    controls: "text-panel-hash",
  },
];

/** Tab ids in bar order, so a panel animates in from the side its tab sits on. */
export const TEXT_TAB_ORDER = TABS.map((t) => t.id);

export function ToolTabs({
  tool,
  onTool,
}: {
  tool: TextTool;
  onTool: (tool: TextTool) => void;
}) {
  return <BottomNav label="Text tools" items={TABS} value={tool} onChange={onTool} maxWidth={560} />;
}
