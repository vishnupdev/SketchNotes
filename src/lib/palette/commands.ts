import type { AppId } from "@/store/useWorkspaceStore";

/**
 * Everything the command palette can do, as data.
 *
 * The palette is shell furniture: it jumps between apps, into a PDF section, or
 * into a workspace-wide setting — and nothing else. No command reaches inside an
 * app (rule #5), so the palette can never be the reason an app breaks.
 *
 * Built from the catalogs the workspace already keeps rather than a list of its
 * own — the app catalog, the PDF editor's tool catalog, the theme table — so an
 * app or a section added anywhere else shows up here with no extra step. The
 * caller passes those in (`buildPaletteCommands`) so this module stays free of
 * React and of any single app's imports, which also makes it testable.
 */

export type PaletteGroup = "app" | "pdf" | "theme" | "workspace";

/** The store operations a command is allowed to perform. */
export interface PaletteContext {
  setActiveApp: (app: AppId) => void;
  setPdfTool: (tool: string | null) => void;
  openSettings: () => void;
  openLauncher: () => void;
  setTheme: (id: string) => void;
  /** Hand a question to the Assistant app and open it. */
  ask: (question: string) => void;
}

export interface PaletteCommand {
  id: string;
  title: string;
  /** Right-hand context line: what this row is, or what it will do. */
  hint: string;
  group: PaletteGroup;
  /** Extra match terms — synonyms, the words people actually type. */
  keywords: string[];
  /** The app this row belongs to, so the UI can draw its mark and hue. */
  app?: AppId;
  run: (ctx: PaletteContext) => void;
}

export interface PaletteInput {
  apps: Array<{ id: AppId; name: string; tagline: string }>;
  pdfTools: Array<{ id: string; name: string; blurb: string }>;
  themes: Array<{ id: string; label: string; dark: boolean }>;
  /** Extra terms per app, so "alarm" finds Reminders. Optional and additive. */
  aliases?: Partial<Record<AppId, string[]>>;
}

export function buildPaletteCommands(input: PaletteInput): PaletteCommand[] {
  const apps: PaletteCommand[] = input.apps.map((app) => ({
    id: `app:${app.id}`,
    title: app.name,
    hint: app.tagline,
    group: "app",
    app: app.id,
    keywords: input.aliases?.[app.id] ?? [],
    run: (ctx) => {
      if (app.id === "pdf") ctx.setPdfTool(null);
      ctx.setActiveApp(app.id);
    },
  }));

  const pdf: PaletteCommand[] = input.pdfTools.map((tool) => ({
    id: `pdf:${tool.id}`,
    title: tool.name,
    hint: "PDF Editor",
    group: "pdf",
    app: "pdf",
    keywords: ["pdf", tool.id, ...tool.blurb.split(/[\s,.]+/).slice(0, 6)],
    run: (ctx) => {
      // Section first, so the editor opens straight into it.
      ctx.setPdfTool(tool.id);
      ctx.setActiveApp("pdf");
    },
  }));

  const themes: PaletteCommand[] = input.themes.map((theme) => ({
    id: `theme:${theme.id}`,
    title: `${theme.label} theme`,
    hint: theme.dark ? "Dark" : "Light",
    group: "theme",
    keywords: ["theme", "colour", "color", theme.dark ? "dark mode" : "light mode", theme.label],
    run: (ctx) => ctx.setTheme(theme.id),
  }));

  const workspace: PaletteCommand[] = [
    {
      id: "ws:settings",
      title: "Settings",
      hint: "Theme, interface, pointer, sound, offline, data",
      group: "workspace",
      keywords: ["preferences", "options", "configure"],
      run: (ctx) => ctx.openSettings(),
    },
    {
      id: "ws:data",
      title: "Back up or restore my data",
      hint: "Settings → Data",
      group: "workspace",
      keywords: ["backup", "export", "import", "restore", "save my data", "move to another device"],
      run: (ctx) => ctx.openSettings(),
    },
    {
      id: "ws:offline",
      title: "Save all apps for offline use",
      hint: "Settings → Offline",
      group: "workspace",
      keywords: ["offline", "download", "no internet", "plane", "flight"],
      run: (ctx) => ctx.openSettings(),
    },
    {
      id: "ws:launcher",
      title: "Browse all apps",
      hint: "Open the app switcher",
      group: "workspace",
      keywords: ["apps", "switcher", "launcher", "grid", "reorder"],
      run: (ctx) => ctx.openLauncher(),
    },
  ];

  return [...apps, ...pdf, ...themes, ...workspace];
}
