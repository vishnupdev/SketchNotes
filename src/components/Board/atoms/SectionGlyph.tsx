import { KIND_BY_TYPE } from "@/lib/Board/catalog";
import type { SectionType } from "@/lib/Board/types";
import {
  LinkIcon,
  ListChecksIcon,
  RepeatIcon,
  TargetIcon,
  TextIcon,
} from "@/components/SketchNotes/atoms/icons";

const GLYPHS: Record<SectionType, typeof TextIcon> = {
  note: TextIcon,
  checklist: ListChecksIcon,
  counter: TargetIcon,
  links: LinkIcon,
  habit: RepeatIcon,
};

interface SectionGlyphProps {
  type: SectionType;
  size?: number;
  /** Draw it in the type's own colour on a soft tile, as on a card header. */
  tile?: boolean;
}

/**
 * The mark for a section type. Colour comes from the type's `--board-*` token
 * (see `catalog.ts`), so the five kinds stay tellable apart at a glance in every
 * theme without any component knowing a colour value.
 */
export function SectionGlyph({ type, size = 16, tile = false }: SectionGlyphProps) {
  const Glyph = GLYPHS[type];
  const hue = `var(${KIND_BY_TYPE[type].hue})`;

  if (!tile) return <Glyph size={size} aria-hidden />;
  return (
    <span
      aria-hidden
      className="grid size-8 flex-none place-items-center rounded-[10px]"
      style={{
        color: hue,
        background: `color-mix(in srgb, ${hue} 15%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${hue} 28%, transparent)`,
      }}
    >
      <Glyph size={size} />
    </span>
  );
}
