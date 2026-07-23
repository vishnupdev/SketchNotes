/**
 * AppFooter — the shared workspace credit footer, used app-wide.
 *
 * Sticky to the bottom of the app's scroll container on every viewport
 * (mirroring the sticky header), so the credit stays visible while content
 * scrolls beneath it. Opaque `bg-paper` keeps scrolled-under content from
 * bleeding through, and it composites on its own layer for smooth scrolling
 * on mobile. Lives in the shared SketchNotes layer because every app reuses it.
 */
export function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-border bg-paper px-5 py-[22px] text-center font-mono text-[10.5px] tracking-[.1em] text-ink-soft">
      <div className="font-serif text-[14.5px] not-italic tracking-normal">
        Crafted by <b className="font-semibold text-accent">Vishnu P</b>
      </div>
    </footer>
  );
}
