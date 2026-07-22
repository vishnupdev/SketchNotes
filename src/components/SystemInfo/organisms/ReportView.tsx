import type { SystemReport } from "@/lib/SystemInfo/types";
import { SummaryGrid } from "@/components/SystemInfo/molecules/SummaryGrid";
import { SystemBand } from "@/components/SystemInfo/molecules/SystemBand";
import { SpecCard } from "@/components/SystemInfo/molecules/SpecCard";
import { FeatureMatrix } from "@/components/SystemInfo/molecules/FeatureMatrix";
import { ReportToolbar } from "@/components/SystemInfo/molecules/ReportToolbar";

interface ReportViewProps {
  report: SystemReport;
  fetching: boolean;
  onRescan: () => void;
}

/** Full report: headline tiles, a masonry of spec cards, and the capability matrix. */
export function ReportView({ report, fetching, onRescan }: ReportViewProps) {
  // The hardware specs get their own full-width band; keep them out of the masonry.
  const hardware = report.sections.find((s) => s.id === "hardware");
  const cards = report.sections.filter((s) => s.id !== "hardware");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-soft">
          Scanned {new Date(report.generatedAt).toLocaleString()}
        </p>
        <ReportToolbar report={report} fetching={fetching} onRescan={onRescan} />
      </div>

      <SummaryGrid summary={report.summary} />

      {hardware && <SystemBand section={hardware} />}

      {/* Balanced multi-column card layout; cards flow to fill each column. */}
      <div className="[column-fill:_balance] gap-4 min-[680px]:columns-2">
        {cards.map((section) => (
          <div key={section.id} className="mb-4 break-inside-avoid">
            <SpecCard section={section} />
          </div>
        ))}
        <div className="mb-4 break-inside-avoid">
          <FeatureMatrix features={report.features} />
        </div>
      </div>

      <p className="px-1 pb-2 text-[11.5px] leading-relaxed text-ink-soft">
        Details come from browser APIs and reflect what the web platform exposes to this page. Some
        values are intentionally coarse or masked for privacy (e.g. device memory is capped, GPU
        strings may be generalised), so they can differ from your operating system&apos;s own report.
      </p>
    </div>
  );
}
