import { Workspace } from "@/components/Workspace";

/**
 * Single client-driven workspace served for every path: `/` (Sketchnotes),
 * `/pdfeditor`, and `/pdfeditor/<section>`. The active app and PDF section are
 * derived from the URL inside {@link Workspace}, so deep links and the browser
 * back/forward buttons work without ever reloading the embedded editor.
 */
export default function Page() {
  return <Workspace />;
}
