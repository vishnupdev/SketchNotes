import type {
  ExportFormat,
  NoteDocument,
  Point,
  SketchElement,
  Tool,
  View,
} from "./types";
import {
  AUTO_LIGHT,
  CURSORS,
  DEFAULT_FONT,
  DEFAULT_TEXT_SIZE,
  EMOJI_SIZE,
  HISTORY_LIMIT,
  MAX_TEXT_SIZE,
  MAX_ZOOM,
  MIN_TEXT_SIZE,
  MIN_ZOOM,
  WIDTHS,
  accentColor,
  fontStack,
  mapColor,
} from "./constants";
import { clamp, bboxOf, contentBBox, hitEl, offsetEl } from "./geometry";
import { drawEl, drawGrid } from "./render";
import { SHAPES, isShape, shapeAbs } from "./shapes";
import { exportDrawing, type ExportResult } from "./export";

/** Live text-editing overlay state emitted to the React layer. */
export interface EditorState {
  left: number;
  top: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  value: string;
  maxWidth: number;
}

export interface EngineCallbacks {
  onSelectionChange?(hasSelection: boolean): void;
  onHistoryChange?(canUndo: boolean, canRedo: boolean): void;
  onZoomChange?(zoom: number): void;
  onEmptyChange?(isEmpty: boolean): void;
  onDirty?(): void;
  onEdit?(state: EditorState | null): void;
  /** Fires when a text element is selected/edited so the pickers can track it. */
  onTextStyle?(font: string, size: number): void;
  onToast?(message: string): void;
  /** Supplies the live text-overlay value when the engine commits internally. */
  getEditValue?(): string;
}

export interface EngineInit {
  bg: HTMLCanvasElement;
  cv: HTMLCanvasElement;
  stage: HTMLElement;
  callbacks: EngineCallbacks;
  dark: boolean;
}

type PointerMode =
  | "draw"
  | "move"
  | "pan"
  | "erase"
  | "pinch"
  | "stamp"
  | "texttap"
  | null;

/**
 * Framework-agnostic drawing engine. Owns the element list, view transform,
 * history and all pointer interaction, rendering imperatively to two canvases
 * (a background grid layer + the ink layer). React drives it through setters
 * and receives derived UI state through {@link EngineCallbacks}. This keeps the
 * 60fps pointer/render path off React's reconciliation cycle.
 */
export class SketchEngine {
  private bg: HTMLCanvasElement;
  private cv: HTMLCanvasElement;
  private stage: HTMLElement;
  private bctx: CanvasRenderingContext2D;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;

  private els: SketchElement[] = [];
  private cur: SketchElement | null = null;
  private sel: SketchElement | null = null;

  private tool: Tool = "pen";
  private color = "auto";
  private widthIdx = 1;
  private width: number = WIDTHS[1];
  private dark: boolean;
  private currentEmoji = "😀";
  /** Font + size applied to new text (and to a selected text element). */
  private fontKey: string = DEFAULT_FONT;
  private textSize = DEFAULT_TEXT_SIZE;

  private view: View = { x: 0, y: 0, s: 1 };

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastSnap = "[]";

  private W = 0;
  private H = 0;
  private dpr = 1;
  private crect = { left: 0, top: 0 };

  // Pointer interaction state
  private pointers = new Map<number, Point>();
  private mode: PointerMode = null;
  private pinch: { d: number; mid: Point; v: View } | null = null;
  private panStart: { x: number; y: number; vx: number; vy: number } | null = null;
  private moveLast: Point | null = null;
  private downLocal: Point | null = null;
  private movedAmt = 0;
  private eraseHit = false;
  private lastTap: { t: number; x: number; y: number } | null = null;

  // Text editing
  private editing = false;
  private editingEl: SketchElement | null = null;
  private editPos: Point = { x: 0, y: 0 };
  private editSize = 24;
  private editColor = "auto";
  private editFont: string = DEFAULT_FONT;
  private editInitialValue = "";

  private lastEmpty = true;
  private ro: ResizeObserver;

  constructor(init: EngineInit) {
    this.bg = init.bg;
    this.cv = init.cv;
    this.stage = init.stage;
    this.cb = init.callbacks;
    this.dark = init.dark;
    this.bctx = this.bg.getContext("2d")!;
    this.ctx = this.cv.getContext("2d")!;

    this.cv.addEventListener("pointerdown", this.onPointerDown);
    this.cv.addEventListener("pointermove", this.onPointerMove);
    this.cv.addEventListener("pointerup", this.onPointerUp);
    this.cv.addEventListener("pointercancel", this.onPointerCancel);
    this.cv.addEventListener("contextmenu", this.onContextMenu);
    this.stage.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onWinResize);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.stage);
    this.resize();
  }

  destroy(): void {
    this.cv.removeEventListener("pointerdown", this.onPointerDown);
    this.cv.removeEventListener("pointermove", this.onPointerMove);
    this.cv.removeEventListener("pointerup", this.onPointerUp);
    this.cv.removeEventListener("pointercancel", this.onPointerCancel);
    this.cv.removeEventListener("contextmenu", this.onContextMenu);
    this.stage.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.onWinResize);
    this.ro.disconnect();
  }

  /* ============ configuration setters (driven by the store) ============ */

  setTool(t: Tool): void {
    this.tool = t;
    if (t !== "select" && this.sel) {
      this.sel = null;
      this.cb.onSelectionChange?.(false);
    }
    this.cv.style.cursor = CURSORS[t] || "crosshair";
    this.drawAll();
  }

  setColor(c: string): void {
    this.color = c;
    if (this.editing) {
      this.editColor = c;
      this.refreshEditor();
    }
    if (this.sel) {
      this.sel.color = c;
      this.commit();
    }
  }

  setWidthIndex(i: number): void {
    this.widthIdx = i;
    this.width = WIDTHS[i];
    if (this.sel && this.sel.type !== "text") {
      this.sel.w = this.width;
      this.commit();
    }
  }

  /** Set the font family for new text, the active edit, and any selected text. */
  setFont(key: string): void {
    this.fontKey = key;
    if (this.editing) {
      this.editFont = key;
      this.refreshEditor();
    }
    if (this.sel && this.sel.type === "text" && (this.sel.font || DEFAULT_FONT) !== key) {
      this.sel.font = key;
      this.commit();
    }
  }

  /** Set the text size (world px) for new text, the active edit, and selection. */
  setTextSize(px: number): void {
    const size = clamp(px, MIN_TEXT_SIZE, MAX_TEXT_SIZE);
    this.textSize = size;
    if (this.editing) {
      this.editSize = size;
      this.refreshEditor();
    }
    if (this.sel && this.sel.type === "text" && this.sel.size !== size) {
      this.sel.size = size;
      this.commit();
    }
  }

  setTheme(dark: boolean): void {
    this.dark = dark;
    if (this.editing) this.refreshEditor();
    this.drawGridLayer();
    this.drawAll();
  }

  setCurrentEmoji(ch: string): void {
    this.currentEmoji = ch;
  }

  /* ============ document lifecycle ============ */

  loadDocument(doc: NoteDocument): void {
    if (this.editing) this.commitText(true);
    this.els = SketchEngine.migrate(doc.els ?? []);
    this.sel = null;
    this.cur = null;
    this.cb.onSelectionChange?.(false);
    this.resetHistory();
    this.fitContent();
    this.emitEmpty();
  }

  /** Reset to a blank document (used for a brand-new note). */
  resetDocument(): void {
    if (this.editing) this.commitText(true);
    this.els = [];
    this.sel = null;
    this.cur = null;
    this.cb.onSelectionChange?.(false);
    this.resetHistory();
    this.view = { x: 0, y: 0, s: 1 };
    this.syncZoom();
    this.drawGridLayer();
    this.drawAll();
    this.emitEmpty();
  }

  getElements(): SketchElement[] {
    return this.els;
  }

  isEmpty(): boolean {
    return this.els.length === 0;
  }

  /** Upgrade legacy notes: old default-ink strokes become theme-aware `auto`. */
  private static migrate(arr: SketchElement[]): SketchElement[] {
    if (Array.isArray(arr))
      for (const el of arr)
        if (el && typeof el.color === "string" && el.color.toLowerCase() === AUTO_LIGHT)
          el.color = "auto";
    return arr;
  }

  /* ============ history ============ */

  private snap(): string {
    return JSON.stringify(this.els);
  }

  private resetHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnap = this.snap();
    this.emitHistory();
  }

  private pushHistory(): void {
    this.undoStack.push(this.lastSnap);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.lastSnap = this.snap();
    this.redoStack = [];
    this.emitHistory();
  }

  /** Commit a mutation: snapshot history, mark dirty, redraw. */
  private commit(): void {
    this.pushHistory();
    this.cb.onDirty?.();
    this.drawAll();
    this.emitEmpty();
  }

  undo(): void {
    if (this.editing) this.commitText(false);
    if (!this.undoStack.length) return;
    this.redoStack.push(this.lastSnap);
    this.lastSnap = this.undoStack.pop()!;
    this.els = JSON.parse(this.lastSnap);
    this.sel = null;
    this.cur = null;
    this.cb.onSelectionChange?.(false);
    this.drawAll();
    this.cb.onDirty?.();
    this.emitHistory();
    this.emitEmpty();
  }

  redo(): void {
    if (this.editing) this.commitText(false);
    if (!this.redoStack.length) return;
    this.undoStack.push(this.lastSnap);
    this.lastSnap = this.redoStack.pop()!;
    this.els = JSON.parse(this.lastSnap);
    this.sel = null;
    this.cur = null;
    this.cb.onSelectionChange?.(false);
    this.drawAll();
    this.cb.onDirty?.();
    this.emitHistory();
    this.emitEmpty();
  }

  clearCanvas(): void {
    if (this.editing) this.commitText(false);
    if (!this.els.length) return;
    this.els = [];
    this.sel = null;
    this.cur = null;
    this.cb.onSelectionChange?.(false);
    this.commit();
    this.cb.onToast?.("Canvas cleared — undo to restore");
  }

  /* ============ selection actions ============ */

  deleteSelection(): void {
    if (!this.sel) return;
    this.els = this.els.filter((x) => x !== this.sel);
    this.sel = null;
    this.cb.onSelectionChange?.(false);
    this.commit();
  }

  duplicateSelection(): void {
    if (!this.sel) return;
    const c: SketchElement = JSON.parse(JSON.stringify(this.sel));
    offsetEl(c, 16, 16);
    this.els.push(c);
    this.sel = c;
    this.commit();
  }

  deselect(): void {
    this.sel = null;
    this.cb.onSelectionChange?.(false);
    this.drawAll();
  }

  hasSelection(): boolean {
    return !!this.sel;
  }

  /* ============ view / zoom ============ */

  private syncZoom(): void {
    this.cb.onZoomChange?.(this.view.s);
  }

  private zoomAt(loc: Point, f: number): void {
    const s = clamp(this.view.s * f, MIN_ZOOM, MAX_ZOOM);
    const wx = (loc.x - this.view.x) / this.view.s;
    const wy = (loc.y - this.view.y) / this.view.s;
    this.view.x = loc.x - wx * s;
    this.view.y = loc.y - wy * s;
    this.view.s = s;
    this.syncZoom();
    this.drawGridLayer();
    this.drawAll();
  }

  zoomIn(): void {
    this.zoomAt({ x: this.W / 2, y: this.H / 2 }, 1.25);
  }

  zoomOut(): void {
    this.zoomAt({ x: this.W / 2, y: this.H / 2 }, 0.8);
  }

  resetZoom(): void {
    this.zoomAt({ x: this.W / 2, y: this.H / 2 }, 1 / this.view.s);
  }

  fitContent(): void {
    this.view = { x: 0, y: 0, s: 1 };
    const b = contentBBox(this.els, shapeAbs);
    if (b) {
      const cw = Math.max(1, b.X - b.x);
      const ch = Math.max(1, b.Y - b.y);
      const s = clamp(Math.min((this.W - 90) / cw, (this.H - 150) / ch, 1), 0.25, 1);
      this.view.s = s;
      this.view.x = (this.W - cw * s) / 2 - b.x * s;
      this.view.y = (this.H - ch * s) / 2 - b.y * s;
    }
    this.syncZoom();
    this.drawGridLayer();
    this.drawAll();
  }

  /* ============ sizing & coordinates ============ */

  private resize = (): void => {
    const r = this.stage.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.dpr = window.devicePixelRatio || 1;
    this.bg.width = this.cv.width = Math.round(this.W * this.dpr);
    this.bg.height = this.cv.height = Math.round(this.H * this.dpr);
    this.crect = this.cv.getBoundingClientRect();
    this.drawGridLayer();
    this.drawAll();
  };

  private onWinResize = (): void => {
    this.crect = this.cv.getBoundingClientRect();
  };

  private toWorld(pt: Point): Point {
    return { x: (pt.x - this.view.x) / this.view.s, y: (pt.y - this.view.y) / this.view.s };
  }

  private localOf(e: { clientX: number; clientY: number }): Point {
    return { x: e.clientX - this.crect.left, y: e.clientY - this.crect.top };
  }

  /* ============ rendering ============ */

  private drawGridLayer(): void {
    drawGrid(this.bctx, this.view, this.W, this.H, this.dpr, this.dark);
  }

  private drawAll(): void {
    const { ctx, dpr, view } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.setTransform(view.s * dpr, 0, 0, view.s * dpr, view.x * dpr, view.y * dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const el of this.els) {
      if (el === this.editingEl) continue;
      drawEl(ctx, el, this.dark);
    }
    if (this.cur) drawEl(ctx, this.cur, this.dark);
    if (this.sel && this.els.includes(this.sel)) this.drawSelBox();
  }

  private drawSelBox(): void {
    if (!this.sel) return;
    const b = bboxOf(this.sel, shapeAbs);
    const p = 6 / this.view.s;
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = accentColor(this.dark);
    ctx.lineWidth = 1.6 / this.view.s;
    ctx.setLineDash([6 / this.view.s, 4 / this.view.s]);
    ctx.strokeRect(b.x - p, b.y - p, b.w + p * 2, b.h + p * 2);
    ctx.restore();
  }

  private emitEmpty(): void {
    const empty = this.els.length === 0 && !this.cur;
    if (empty !== this.lastEmpty) {
      this.lastEmpty = empty;
      this.cb.onEmptyChange?.(empty);
    }
  }

  private emitHistory(): void {
    this.cb.onHistoryChange?.(this.undoStack.length > 0, this.redoStack.length > 0);
  }

  /** Surface the font/size of the text being edited or selected to the UI. */
  private emitTextStyle(): void {
    if (this.editing) {
      this.cb.onTextStyle?.(this.editFont, this.editSize);
    } else if (this.sel && this.sel.type === "text") {
      this.cb.onTextStyle?.(this.sel.font || DEFAULT_FONT, this.sel.size);
    }
  }

  /* ============ hit testing ============ */

  private hitTest(p: Point): SketchElement | null {
    const tol = 9 / this.view.s;
    for (let i = this.els.length - 1; i >= 0; i--) {
      if (this.els[i] === this.editingEl) continue;
      if (hitEl(this.els[i], p, tol, shapeAbs)) return this.els[i];
    }
    return null;
  }

  private hitText(p: Point): SketchElement | null {
    for (let i = this.els.length - 1; i >= 0; i--)
      if (
        this.els[i].type === "text" &&
        this.els[i] !== this.editingEl &&
        hitEl(this.els[i], p, 8 / this.view.s, shapeAbs)
      )
        return this.els[i];
    return null;
  }

  /* ============ pointer handlers ============ */

  private onPointerDown = (e: PointerEvent): void => {
    if (this.editing) {
      this.commitText(false);
      return;
    }
    this.cv.setPointerCapture(e.pointerId);
    const loc = this.localOf(e);
    this.pointers.set(e.pointerId, loc);
    if (this.pointers.size === 2) {
      this.cur = null;
      this.panStart = null;
      this.moveLast = null;
      this.startPinch();
      this.mode = "pinch";
      this.drawAll();
      return;
    }
    if (this.pointers.size > 2) return;
    this.downLocal = loc;
    this.movedAmt = 0;
    const p = this.toWorld(loc);
    const { tool, color, width } = this;

    if (tool === "pen") {
      this.mode = "draw";
      this.cur = { type: "pen", points: [p], color, w: width };
    } else if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "ellipse") {
      this.mode = "draw";
      this.cur = { type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, w: width };
    } else if (isShape(tool)) {
      this.mode = "draw";
      this.cur = { type: "shape", shape: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, w: width };
    } else if (tool === "emoji") {
      this.mode = "stamp";
      this.stampAt(p);
    } else if (tool === "eraser") {
      this.mode = "erase";
      this.eraseHit = false;
      this.eraseAt(p);
    } else if (tool === "text") {
      this.mode = "texttap";
    } else {
      // select
      const hit = this.hitTest(p);
      if (hit) {
        this.sel = hit;
        this.mode = "move";
        this.moveLast = p;
        if (hit.type === "text") this.emitTextStyle();
      } else {
        this.sel = null;
        this.mode = "pan";
        this.panStart = { x: loc.x, y: loc.y, vx: this.view.x, vy: this.view.y };
      }
      this.cb.onSelectionChange?.(!!this.sel);
      this.drawAll();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const loc = this.localOf(e);
    this.pointers.set(e.pointerId, loc);
    if (this.mode === "pinch") {
      this.pinchMove();
      return;
    }
    if (this.downLocal)
      this.movedAmt = Math.max(
        this.movedAmt,
        Math.hypot(loc.x - this.downLocal.x, loc.y - this.downLocal.y),
      );

    if (this.mode === "draw" && this.cur) {
      if (this.cur.type === "pen") {
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of evs) {
          const wp = this.toWorld(this.localOf(ev));
          const lp = this.cur.points[this.cur.points.length - 1];
          if (Math.hypot(wp.x - lp.x, wp.y - lp.y) > 1 / this.view.s) this.cur.points.push(wp);
        }
      } else if (
        this.cur.type === "line" ||
        this.cur.type === "arrow" ||
        this.cur.type === "rect" ||
        this.cur.type === "ellipse" ||
        this.cur.type === "shape"
      ) {
        const p = this.toWorld(loc);
        this.cur.x2 = p.x;
        this.cur.y2 = p.y;
        if (e.shiftKey) {
          const dx = this.cur.x2 - this.cur.x1;
          const dy = this.cur.y2 - this.cur.y1;
          if (this.cur.type === "rect" || this.cur.type === "ellipse" || this.cur.type === "shape") {
            const s = Math.max(Math.abs(dx), Math.abs(dy));
            this.cur.x2 = this.cur.x1 + (dx < 0 ? -s : s);
            this.cur.y2 = this.cur.y1 + (dy < 0 ? -s : s);
          } else if (Math.abs(dx) > Math.abs(dy)) this.cur.y2 = this.cur.y1;
          else this.cur.x2 = this.cur.x1;
        }
      }
      this.drawAll();
    } else if (this.mode === "move" && this.sel && this.moveLast) {
      const p = this.toWorld(loc);
      offsetEl(this.sel, p.x - this.moveLast.x, p.y - this.moveLast.y);
      this.moveLast = p;
      this.drawAll();
    } else if (this.mode === "pan" && this.panStart) {
      this.view.x = this.panStart.vx + (loc.x - this.panStart.x);
      this.view.y = this.panStart.vy + (loc.y - this.panStart.y);
      this.drawGridLayer();
      this.drawAll();
    } else if (this.mode === "erase") {
      this.eraseAt(this.toWorld(loc));
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.mode === "pinch") {
      if (this.pointers.size < 2) {
        this.mode = null;
        this.pinch = null;
      }
      return;
    }
    const loc = this.localOf(e);
    if (this.mode === "draw" && this.cur) {
      let keep = true;
      if (this.cur.type !== "pen") {
        const c = this.cur as { x1: number; y1: number; x2: number; y2: number };
        const dx = Math.abs(c.x2 - c.x1);
        const dy = Math.abs(c.y2 - c.y1);
        if (dx < 3 / this.view.s && dy < 3 / this.view.s) {
          if (this.cur.type === "shape") {
            // tap = drop a default-sized shape
            const d = 90;
            c.x1 = c.x1 - d / 2;
            c.y1 = c.y1 - d / 2;
            c.x2 = c.x1 + d;
            c.y2 = c.y1 + d;
          } else keep = false;
        }
      }
      if (keep) {
        this.els.push(this.cur);
        this.pushHistory();
        this.cb.onDirty?.();
      }
      this.cur = null;
    } else if (this.mode === "move") {
      if (this.movedAmt > 4) {
        this.pushHistory();
        this.cb.onDirty?.();
      } else this.tapCheck(loc);
    } else if (this.mode === "pan") {
      if (this.movedAmt <= 4) this.tapCheck(loc);
    } else if (this.mode === "erase") {
      if (this.eraseHit) {
        this.pushHistory();
        this.cb.onDirty?.();
      }
    } else if (this.mode === "texttap") {
      if (this.movedAmt <= 6) {
        const p = this.toWorld(loc);
        const t = this.hitText(p);
        if (t) this.startEdit(t);
        else this.startEdit(null, p);
      }
    }
    this.mode = null;
    this.drawAll();
    this.emitEmpty();
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.mode === "pinch") {
      if (this.pointers.size < 2) {
        this.mode = null;
        this.pinch = null;
      }
    } else {
      this.cur = null;
      this.mode = null;
      this.drawAll();
    }
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const mult = e.deltaMode === 1 ? 16 : 1;
    if (e.ctrlKey || e.metaKey) {
      this.zoomAt(
        { x: e.clientX - this.crect.left, y: e.clientY - this.crect.top },
        Math.exp(-e.deltaY * mult * 0.0015),
      );
    } else {
      this.view.x -= e.deltaX * mult;
      this.view.y -= e.deltaY * mult;
      this.drawGridLayer();
      this.drawAll();
    }
  };

  /* ============ interaction helpers ============ */

  private stampAt(p: Point): void {
    if (!this.currentEmoji) return;
    this.els.push({
      type: "emoji",
      ch: this.currentEmoji,
      x: p.x - EMOJI_SIZE / 2,
      y: p.y - EMOJI_SIZE / 2,
      size: EMOJI_SIZE,
      color: "auto",
      w: 2,
    });
    this.commit();
  }

  private tapCheck(loc: Point): void {
    const now = performance.now();
    if (
      this.lastTap &&
      now - this.lastTap.t < 350 &&
      Math.hypot(loc.x - this.lastTap.x, loc.y - this.lastTap.y) < 28
    ) {
      const p = this.toWorld(loc);
      const t = this.hitText(p);
      this.sel = null;
      this.cb.onSelectionChange?.(false);
      if (t) this.startEdit(t);
      else this.startEdit(null, p);
      this.lastTap = null;
      return;
    }
    this.lastTap = { t: now, x: loc.x, y: loc.y };
  }

  private eraseAt(p: Point): void {
    const tol = 11 / this.view.s;
    for (let i = this.els.length - 1; i >= 0; i--) {
      if (hitEl(this.els[i], p, tol, shapeAbs)) {
        if (this.sel === this.els[i]) {
          this.sel = null;
          this.cb.onSelectionChange?.(false);
        }
        this.els.splice(i, 1);
        this.eraseHit = true;
        this.drawAll();
        return;
      }
    }
  }

  private startPinch(): void {
    const pts = [...this.pointers.values()];
    this.pinch = {
      d: Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)),
      mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      v: { ...this.view },
    };
  }

  private pinchMove(): void {
    const pts = [...this.pointers.values()];
    if (pts.length < 2 || !this.pinch) return;
    const d = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const s = clamp((this.pinch.v.s * d) / this.pinch.d, MIN_ZOOM, MAX_ZOOM);
    const wx = (this.pinch.mid.x - this.pinch.v.x) / this.pinch.v.s;
    const wy = (this.pinch.mid.y - this.pinch.v.y) / this.pinch.v.s;
    this.view.s = s;
    this.view.x = mid.x - wx * s;
    this.view.y = mid.y - wy * s;
    this.syncZoom();
    this.drawGridLayer();
    this.drawAll();
  }

  /* ============ text editing ============ */

  private startEdit(el: SketchElement | null, worldP?: Point): void {
    this.editing = true;
    this.editingEl = el && el.type === "text" ? el : null;
    const textEl = this.editingEl && this.editingEl.type === "text" ? this.editingEl : null;
    this.editSize = textEl ? textEl.size : this.textSize;
    this.editColor = textEl ? textEl.color : this.color;
    this.editFont = textEl ? textEl.font || DEFAULT_FONT : this.fontKey;
    this.editPos = textEl ? { x: textEl.x, y: textEl.y } : worldP || { x: 0, y: 0 };
    this.editInitialValue = textEl ? textEl.text : "";
    this.drawAll();
    this.refreshEditor();
    this.emitTextStyle();
  }

  /**
   * Recompute and push the editor overlay state to React. `value` always
   * carries the value captured at edit-start; the overlay keys off it once on
   * open and manages its own text thereafter, so restyling mid-edit (colour,
   * size, theme) never clobbers what the user is typing.
   */
  private refreshEditor(): void {
    if (!this.editing) return;
    this.cb.onEdit?.({
      left: this.editPos.x * this.view.s + this.view.x - 6,
      top: this.editPos.y * this.view.s + this.view.y - 4,
      fontSize: this.editSize * this.view.s,
      fontFamily: fontStack(this.editFont),
      color: mapColor(this.editColor, this.dark),
      value: this.editInitialValue,
      maxWidth: this.W * 0.8,
    });
  }

  /**
   * Finalise the active text edit. The value is pulled from the React overlay
   * via `getEditValue`, so both React (blur/escape) and the engine (pointer
   * down elsewhere, undo, export) commit the same live text.
   */
  commitText(cancel: boolean): void {
    if (!this.editing) return;
    this.editing = false;
    const value = this.cb.getEditValue?.() ?? "";
    this.cb.onEdit?.(null);
    const val = value.replace(/\s+$/, "");
    if (cancel) {
      this.editingEl = null;
      this.drawAll();
      return;
    }
    if (this.editingEl && this.editingEl.type === "text") {
      if (val) {
        this.editingEl.text = val;
        // Persist any font/size/colour changes made while editing.
        this.editingEl.size = this.editSize;
        this.editingEl.font = this.editFont;
        this.editingEl.color = this.editColor;
      } else this.els = this.els.filter((x) => x !== this.editingEl);
      this.pushHistory();
      this.cb.onDirty?.();
    } else if (val) {
      this.els.push({
        type: "text",
        x: this.editPos.x,
        y: this.editPos.y,
        text: val,
        size: this.editSize,
        font: this.editFont,
        color: this.editColor,
        w: 2,
      });
      this.pushHistory();
      this.cb.onDirty?.();
    }
    this.editingEl = null;
    this.drawAll();
    this.emitEmpty();
  }

  isEditing(): boolean {
    return this.editing;
  }

  /* ============ export ============ */

  export(fmt: ExportFormat, title: string): Promise<ExportResult | null> {
    if (this.editing) this.commitText(false);
    return exportDrawing(fmt, this.els, title, this.dark);
  }
}
