/** Tool catalogue shared by the home grid and the router. */
export interface ToolInfo {
  id: string;
  code: string;
  name: string;
  /** Short blurb shown on the home card. */
  blurb: string;
  /** Longer description shown in the tool header. */
  desc: string;
}

export const TOOLS: ToolInfo[] = [
  {
    id: "edit",
    code: "EDT",
    name: "Edit & annotate",
    blurb: "Retype existing text, add new text, draw, highlight or white-out — baked into the file.",
    desc: "Tap existing text to retype it, add new text anywhere, draw, highlight or white-out. Edits are flattened into the PDF when you apply.",
  },
  {
    id: "merge",
    code: "MRG",
    name: "Merge PDFs",
    blurb: "Combine several PDFs into one, in exactly the order you set.",
    desc: "Add two or more PDFs, arrange the order, and press merge.",
  },
  {
    id: "split",
    code: "SPL",
    name: "Split PDF",
    blurb: "Cut a PDF into custom page ranges, or burst every page into its own file.",
    desc: "Pull out custom ranges (each range becomes its own file), or burst every page into a separate PDF.",
  },
  {
    id: "organize",
    code: "ORG",
    name: "Organize pages",
    blurb: "Visual editor: drag to reorder, rotate, delete and extract pages.",
    desc: "Tap pages to select them. Drag to reorder. Rotate, delete or extract the selection, then apply.",
  },
  {
    id: "create",
    code: "TXT",
    name: "Text → PDF",
    blurb: "Turn plain text into a clean, paginated document.",
    desc: "Paste or write text and get a clean, paginated PDF. Latin characters supported by the built-in fonts.",
  },
  {
    id: "img",
    code: "IMG",
    name: "Images → PDF",
    blurb: "Stitch photos and scans into a single PDF, one image per page.",
    desc: "JPG, PNG, WebP or GIF — each image becomes a page, in the order you set.",
  },
  {
    id: "toimg",
    code: "EXP",
    name: "PDF → Images",
    blurb: "Export every page as a PNG or JPEG, zipped and ready.",
    desc: "Render every page to an image. One page downloads directly; more get zipped.",
  },
  {
    id: "wm",
    code: "WMK",
    name: "Watermark",
    blurb: "Stamp text like CONFIDENTIAL or DRAFT across every page.",
    desc: "Stamp a line of text across every page.",
  },
  {
    id: "num",
    code: "NUM",
    name: "Page numbers",
    blurb: "Add page numbering in the position and format you want.",
    desc: "Add numbering to every page.",
  },
  {
    id: "meta",
    code: "INF",
    name: "Metadata",
    blurb: "View and edit the title, author, keywords and other document info.",
    desc: "Read and rewrite the document information fields.",
  },
];

export const TOOL_IDS = TOOLS.map((t) => t.id);
