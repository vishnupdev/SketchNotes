"use client";

import { TOOLS } from "@/components/PdfEditor/catalog";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/** The "pick a job ticket" tool grid shown at the PDF editor home. */
export function PdfHome() {
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);

  return (
    <section>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[.16em] text-ink-soft">
        Pick a job ticket
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(235px,1fr))] gap-3.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPdfTool(t.id)}
            className="group relative rounded-xl border border-border bg-panel p-4 pb-3.5 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:border-accent"
          >
            <span className="inline-block rounded-[5px] border border-accent px-1.5 py-0.5 font-mono text-[10px] tracking-[.18em] text-accent">
              {t.code}
            </span>
            <h3 className="mb-1.5 mt-2.5 text-[16.5px] font-bold tracking-tight">{t.name}</h3>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">{t.blurb}</p>
            <span className="absolute bottom-2.5 right-3 font-mono text-[13px] text-accent opacity-0 transition-opacity group-hover:opacity-100">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
