"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SHEETS_TOOLS, useSheetsStore, type SheetsTool } from "@/store/useSheetsStore";
import { TablePanel } from "@/components/Sheets/organisms/TablePanel";
import { StatsPanel } from "@/components/Sheets/organisms/StatsPanel";
import { ChartPanel } from "@/components/Sheets/organisms/ChartPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  BarChartIcon,
  SummaryIcon,
  TableIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<SheetsTool>[] = [
  {
    id: "table",
    label: "Table",
    hint: "Sort, filter, search and edit the rows",
    icon: <TableIcon size={19} />,
    controls: "sheets-panel-table",
  },
  {
    id: "stats",
    label: "Summary",
    hint: "What a column actually contains",
    icon: <SummaryIcon size={19} />,
    controls: "sheets-panel-stats",
  },
  {
    id: "chart",
    label: "Chart",
    hint: "Plot one measure against one grouping",
    icon: <BarChartIcon size={19} />,
    controls: "sheets-panel-chart",
  },
];

/**
 * Sheets — the three questions you have about a CSV, in the order you have
 * them.
 *
 * Nothing in the workspace touched tabular data, which is the format every
 * export in the world arrives in. What is here is deliberately not a
 * spreadsheet: there are no formulas, no cell references and no second sheet.
 * It answers *what is in this file*, *is this column what I think it is*, and
 * *what does it look like* — then hands the result back out as CSV, TSV,
 * Markdown or JSON.
 *
 * The file is read, typed and charted entirely on the device, so it works
 * offline and a table of salaries or patient records never leaves the browser.
 */
export function SheetsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useSheetsStore((s) => s.tool);
  const setTool = useSheetsStore((s) => s.setTool);
  const name = useSheetsStore((s) => s.name);
  const sheet = useSheetsStore((s) => s.sheet);
  const hydrate = useSheetsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<TableIcon size={24} />}
            name="Sheets"
            tagline={sheet ? name : "read a table, and see what is in it"}
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="bottom-nav-clear mx-auto w-full max-w-[900px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={SHEETS_TOOLS} id={`sheets-panel-${tool}`} role="tabpanel">
          {tool === "table" ? <TablePanel /> : tool === "stats" ? <StatsPanel /> : <ChartPanel />}
        </NavView>
      </main>

      <BottomNav label="Sheets tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
