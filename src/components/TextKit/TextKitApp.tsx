"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTextKitStore } from "@/store/useTextKitStore";
import { ToolTabs, TEXT_TAB_ORDER } from "@/components/TextKit/molecules/ToolTabs";
import { TransformPanel } from "@/components/TextKit/organisms/TransformPanel";
import { EncodePanel } from "@/components/TextKit/organisms/EncodePanel";
import { JsonPanel } from "@/components/TextKit/organisms/JsonPanel";
import { DiffPanel } from "@/components/TextKit/organisms/DiffPanel";
import { RegexPanel } from "@/components/TextKit/organisms/RegexPanel";
import { HashPanel } from "@/components/TextKit/organisms/HashPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AppsIcon, TextKitIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Text Kit — the small operations on text that otherwise send you to a stranger's
 * website with an upload box: change the case, sort and dedupe lines, encode and
 * decode, tidy JSON and find out why it won't parse, compare two versions, test a
 * pattern, take a checksum.
 *
 * Two decisions shape the app:
 *
 *  - **One shared draft.** Every tool reads and writes the same text, so they
 *    compose: decode a payload, format the JSON inside it, then diff it against
 *    yesterday's. It is persisted too, because what people paste into a text tool
 *    is usually mid-task and losing it to a refresh is why those sites feel
 *    disposable.
 *  - **Everything is local.** No network at any point, which is the whole reason
 *    to have it here — the text you would least like to upload is exactly the
 *    text you need a tool for.
 */
export function TextKitApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useTextKitStore((s) => s.tool);
  const setTool = useTextKitStore((s) => s.setTool);
  const hydrate = useTextKitStore((s) => s.hydrate);

  // Adopt the saved draft once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<TextKitIcon size={24} />}
            name="Text Kit"
            tagline="the small jobs on text, done here"
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[860px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={TEXT_TAB_ORDER} id={`text-panel-${tool}`} role="tabpanel">
          {tool === "transform" ? (
            <TransformPanel />
          ) : tool === "encode" ? (
            <EncodePanel />
          ) : tool === "json" ? (
            <JsonPanel />
          ) : tool === "diff" ? (
            <DiffPanel />
          ) : tool === "regex" ? (
            <RegexPanel />
          ) : (
            <HashPanel />
          )}
        </NavView>
      </main>

      <ToolTabs tool={tool} onTool={setTool} />

      <AppFooter />
    </div>
  );
}
