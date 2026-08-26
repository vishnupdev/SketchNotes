"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * One Mermaid diagram.
 *
 * Mermaid is imported **dynamically, inside the effect** — never at module scope.
 * It is by far the largest dependency in the workspace, and a static import would
 * put it in Markdown Studio's own chunk, so opening the app to type a paragraph
 * would download a diagram engine. This way the cost is paid only by a document
 * that actually contains a ```mermaid fence, and only once per session.
 *
 * `mermaid.render` returns an SVG string, which is the one place this app cannot
 * avoid `innerHTML`. That is acceptable here and nowhere else: the markup is
 * produced by Mermaid from the diagram source, `htmlLabels` is off so label text
 * cannot carry markup through, and Mermaid's own `securityLevel: "strict"`
 * sanitises what it emits. The document's *prose* still never goes near innerHTML
 * — see `MarkdownView`.
 */
export function MermaidFigure({ source, dark }: { source: string; dark: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  // A stable, CSS-identifier-safe id: Mermaid uses it as an element id.
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(null);

    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          // Label text stays SVG text rather than embedded HTML, which keeps the
          // diagram inert and makes it export cleanly.
          htmlLabels: false,
          theme: dark ? "dark" : "default",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });

        const { svg } = await mermaid.render(id, source);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        setPending(false);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "";
        // Two very different failures reach here and they need different answers.
        //
        // The engine is deliberately *not* precached for offline — it is ~2.5 MB
        // and most documents have no diagram in them (see
        // `scripts/generate-precache.mjs`) — so the first diagram ever rendered
        // needs a connection. A failed dynamic import says "Failed to fetch
        // dynamically imported module", which would otherwise be shown to the
        // user as if their diagram were malformed.
        const offline = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message);
        setError(
          offline
            ? "The diagram engine has not been downloaded yet, and it needs a connection the first time. Everything else here works offline; once a diagram has rendered once, it will too."
            : message.split("\n")[0] || "That diagram could not be drawn.",
        );
        setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dark, id, source]);

  if (error) {
    return (
      <div className="rounded-[10px] border border-danger/50 bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-[.12em] text-danger">
          Mermaid could not draw this
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{error}</p>
        <pre className="mt-2 overflow-x-auto font-mono text-[11.5px] text-ink-soft">
          <code>{source}</code>
        </pre>
      </div>
    );
  }

  return (
    <figure className="my-3 overflow-x-auto rounded-[10px] border border-border bg-paper p-3">
      {pending && (
        <p className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
          Drawing the diagram…
        </p>
      )}
      {/* Mermaid writes the SVG here. Empty until it does. */}
      <div ref={hostRef} className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full" />
    </figure>
  );
}
