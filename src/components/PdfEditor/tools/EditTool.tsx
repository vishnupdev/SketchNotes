"use client";

import { useEffect, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { baseName, fmtSize, friendly, isPdf } from "@/lib/PdfEditor/helpers";
import { getPdfjs } from "@/lib/PdfEditor/pdfjs";
import { useSinglePdf } from "@/lib/PdfEditor/useSinglePdf";
import {
  Dropzone,
  FileChip,
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  btnSm,
  useToolState,
} from "@/components/PdfEditor/ui";
import { cx } from "@/lib/utils";

const smGhost = cx(btnSm, "border-border bg-panel text-text hover:border-accent hover:text-accent");
const smSolid = cx(btnSm, "border-accent bg-accent text-white");

/* eslint-disable @typescript-eslint/no-explicit-any */
export function EditTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();

  // Imperative editor API (populated once on mount) + latest callbacks.
  const api = useRef<{ init: (i: any) => void; clear: () => void; apply: () => void } | null>(null);
  const cb = useRef({ setStatus, clearResults, deliver });
  cb.current = { setStatus, clearResults, deliver };

  useEffect(() => {
    const $ = (id: string) => document.getElementById(id)!;
    const $$ = (sel: string) => [...document.querySelectorAll(sel)] as HTMLElement[];
    const disposers: Array<() => void> = [];
    const on = (el: EventTarget, ev: string, fn: EventListenerOrEventListenerObject) => {
      el.addEventListener(ev, fn);
      disposers.push(() => el.removeEventListener(ev, fn));
    };

    let editPdfjs: any = null;
    let EDITFILE: { bytes: Uint8Array; name: string; pageCount: number } | null = null;

    const ED: any = {
      page: 0,
      vp: { w: 1, h: 1 },
      annos: {} as Record<number, any[]>,
      items: {} as Record<number, any[]>,
      mode: "retext",
      tmp: null as any,
      editing: null as any,
    };
    const EDIT_SIZES: any = { s: { text: 11, pen: 1.6 }, m: { text: 16, pen: 3 }, l: { text: 24, pen: 6 } };
    const EDIT_FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    const HL_FILL = "rgba(255,222,0,.42)";
    const FONT_STACKS: any = {
      sans: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      serif: "Georgia,'Times New Roman',Times,serif",
      mono: "ui-monospace,'SF Mono',Menlo,Consolas,monospace",
    };
    const measCtx = document.createElement("canvas").getContext("2d")!;

    const editAnnos = () => (ED.annos[ED.page] = ED.annos[ED.page] || []);
    const fontKeyOf = (fam: string) =>
      /mono/i.test(fam || "") ? "mono" : /serif/i.test(fam || "") && !/sans/i.test(fam || "") ? "serif" : "sans";
    const rgb2hex = (c: string) => {
      const m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c || "");
      return m
        ? "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("")
        : c || "#14151a";
    };
    const fmtState = () => ({
      fkey: (($("edit-font") as HTMLSelectElement).value),
      font: FONT_STACKS[($("edit-font") as HTMLSelectElement).value],
      size: Math.min(120, Math.max(6, parseFloat(($("edit-tsize") as HTMLInputElement).value) || 16)),
      color: ($("edit-tcolor") as HTMLInputElement).value,
      bold: $("edit-b").classList.contains("on"),
      italic: $("edit-i").classList.contains("on"),
      under: $("edit-u").classList.contains("on"),
      strike: $("edit-st").classList.contains("on"),
    });
    const cssFontOf = (f: any, px: number) =>
      (f.italic ? "italic " : "") + (f.bold ? "800 " : "500 ") + px + "px " + f.font;
    const annoFontOf = (a: any, k: number) =>
      (a.italic ? "italic " : "") + (a.bold ? "800 " : "500 ") + a.size * k + "px " + (a.font || EDIT_FONT);

    function syncOpenInput() {
      const ta = document.getElementById("edit-input") as any;
      if (!ta) return;
      const f = fmtState();
      ta.style.font = cssFontOf(f, f.size * (ta._k || 1));
      ta.style.color = f.color;
      ta.style.textDecoration =
        [f.under && "underline", f.strike && "line-through"].filter(Boolean).join(" ") || "none";
      if (ta._fit) ta._fit();
    }
    function setFmtToggles(b: boolean, i: boolean, u: boolean, st: boolean) {
      ([["edit-b", b], ["edit-i", i], ["edit-u", u], ["edit-st", st]] as [string, boolean][]).forEach(
        ([id, on]) => {
          const el = $(id);
          el.classList.toggle("on", !!on);
          el.setAttribute("aria-pressed", String(!!on));
        },
      );
    }
    function caretIndex(text: string, font: string, targetX: number, refW: number | null) {
      if (!text) return 0;
      measCtx.font = font;
      const total = measCtx.measureText(text).width || 1;
      const sc = refW ? refW / total : 1;
      let prev = 0;
      for (let i = 1; i <= text.length; i++) {
        const w = measCtx.measureText(text.slice(0, i)).width * sc;
        if (w >= targetX) return targetX - prev < w - targetX ? i - 1 : i;
        prev = w;
      }
      return text.length;
    }
    function hitAnno(p: any) {
      const list = editAnnos();
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i];
        if (a.type === "retext") {
          const dx = p.x - a.bx,
            dy = p.y - a.by;
          const ca = Math.cos(a.angle),
            sa = Math.sin(a.angle);
          const lx = dx * ca + dy * sa,
            ly = -dx * sa + dy * ca;
          measCtx.font = annoFontOf(a, 1);
          const w = Math.max(a.w, a.text ? measCtx.measureText(a.text).width : 0);
          if (lx >= -2 && lx <= w + 2 && ly >= -a.size * a.asc - 2 && ly <= a.size * a.desc + 2)
            return { a, lx, ly };
        } else if (a.type === "text") {
          measCtx.font = annoFontOf(a, 1);
          const lines = String(a.text).split("\n");
          const w = Math.max(...lines.map((L) => measCtx.measureText(L).width));
          const h = lines.length * a.size * 1.28;
          if (p.x >= a.x - 2 && p.x <= a.x + w + 2 && p.y >= a.y - 2 && p.y <= a.y + h + 2)
            return { a, lx: p.x - a.x, ly: p.y - a.y };
        }
      }
      return null;
    }
    function killEditInput(commit: boolean) {
      const el = document.getElementById("edit-input") as any;
      if (!el) return;
      if (commit) {
        const f = fmtState();
        let v = el.value.replace(/\s+$/, "");
        if (el._single) v = v.replace(/\n+/g, " ");
        if (el._run) {
          const rn = el._run,
            ini = el._init || {};
          const changed =
            v !== rn.str ||
            f.bold ||
            f.italic ||
            f.under ||
            f.strike ||
            f.color !== ini.color ||
            Math.round(f.size) !== Math.round(ini.size) ||
            f.fkey !== ini.fkey;
          if (changed)
            editAnnos().push({
              type: "retext",
              text: v,
              bx: rn.bx,
              by: rn.by,
              angle: rn.angle,
              size: f.size,
              w: rn.w,
              asc: rn.asc,
              desc: rn.desc,
              font: f.font,
              fkey: f.fkey,
              color: f.color,
              bg: rn._bg || "#ffffff",
              bold: f.bold,
              italic: f.italic,
              under: f.under,
              strike: f.strike,
            });
        } else if (el._anno) {
          const a = el._anno,
            arr = editAnnos(),
            ix = arr.indexOf(a);
          const patch = {
            text: v,
            size: f.size,
            font: f.font,
            fkey: f.fkey,
            color: f.color,
            bold: f.bold,
            italic: f.italic,
            under: f.under,
            strike: f.strike,
          };
          if (a.type === "text" && !v.trim()) {
            if (ix > -1) arr.splice(ix, 1);
          } else if (ix > -1) arr.splice(ix, 1, Object.assign({}, a, patch));
        } else if (v.trim()) {
          editAnnos().push({
            type: "text",
            text: v,
            x: el._pt.x,
            y: el._pt.y,
            size: f.size,
            color: f.color,
            font: f.font,
            fkey: f.fkey,
            bold: f.bold,
            italic: f.italic,
            under: f.under,
            strike: f.strike,
          });
        }
      }
      el.remove();
      ED.editing = null;
      repaintAnnos();
    }
    function clearEdit() {
      if (editPdfjs) {
        try {
          editPdfjs.destroy();
        } catch {}
        editPdfjs = null;
      }
      killEditInput(false);
      ED.page = 0;
      ED.annos = {};
      ED.items = {};
      ED.tmp = null;
      ED.editing = null;
      EDITFILE = null;
    }
    async function initEdit(item: any) {
      clearEdit();
      EDITFILE = item;
      try {
        const pdfjs = await getPdfjs();
        editPdfjs = await pdfjs.getDocument({ data: item.bytes.slice() }).promise;
        await showEditPage(0);
        cb.current.setStatus("Tap any dashed text box to retype it — or pick another tool above.", "ok");
      } catch (e) {
        clearEdit();
        cb.current.setStatus(friendly(e), "err");
      }
    }
    async function showEditPage(idx: number) {
      if (!EDITFILE || !editPdfjs) return;
      killEditInput(true);
      ED.page = Math.max(0, Math.min(idx, EDITFILE.pageCount - 1));
      try {
        const page = await editPdfjs.getPage(ED.page + 1);
        const vp1 = page.getViewport({ scale: 1 });
        ED.vp = { w: vp1.width, h: vp1.height };
        const stage = $("edit-stage");
        const cssW = Math.max(280, Math.min(stage.clientWidth || 640, 900));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale: (cssW / vp1.width) * dpr });
        const base = $("edit-base") as HTMLCanvasElement,
          anno = $("edit-anno") as HTMLCanvasElement;
        base.width = anno.width = Math.round(vp.width);
        base.height = anno.height = Math.round(vp.height);
        await page.render({ canvasContext: base.getContext("2d")!, viewport: vp }).promise;
        if (!ED.items[ED.page]) {
          try {
            ED.items[ED.page] = await loadTextItems(page);
          } catch {
            ED.items[ED.page] = [];
          }
        }
        repaintAnnos();
        ($("edit-goto") as HTMLInputElement).value = String(ED.page + 1);
        ($("edit-goto") as HTMLInputElement).max = String(EDITFILE.pageCount);
        $("edit-total").textContent = String(EDITFILE.pageCount);
      } catch (e) {
        cb.current.setStatus(friendly(e), "err");
      }
    }
    function drawAnnoList(ctx: any, list: any[], k: number, guides: boolean) {
      for (const a of list) {
        if (a.type === "pen") {
          ctx.strokeStyle = a.color;
          ctx.lineWidth = Math.max(1, a.w * k);
          ctx.lineJoin = ctx.lineCap = "round";
          ctx.beginPath();
          a.pts.forEach((p: any, i: number) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)));
          ctx.stroke();
        } else if (a.type === "hl" || a.type === "wo") {
          const x = Math.min(a.x, a.x + a.w) * k,
            y = Math.min(a.y, a.y + a.h) * k;
          const w = Math.abs(a.w) * k,
            h = Math.abs(a.h) * k;
          ctx.fillStyle = a.type === "hl" ? HL_FILL : "#ffffff";
          ctx.fillRect(x, y, w, h);
          if (guides && a.type === "wo") {
            ctx.strokeStyle = "rgba(20,21,26,.18)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
          }
        } else if (a.type === "retext") {
          ctx.save();
          ctx.translate(a.bx * k, a.by * k);
          ctx.rotate(a.angle);
          ctx.font = (a.italic ? "italic " : "") + (a.bold ? "800 " : "500 ") + a.size * k + "px " + a.font;
          const tw = a.text ? ctx.measureText(a.text).width : 0;
          const pad = a.size * 0.15 * k;
          ctx.fillStyle = a.bg;
          ctx.fillRect(-pad, -a.size * a.asc * k - pad, Math.max(a.w * k, tw) + pad * 2, a.size * (a.asc + a.desc) * k + pad * 2);
          if (a.text) {
            ctx.fillStyle = a.color;
            ctx.textBaseline = "alphabetic";
            ctx.fillText(a.text, 0, 0);
            const th = Math.max(1, a.size * k * 0.07);
            if (a.under) ctx.fillRect(0, a.size * k * 0.12, tw, th);
            if (a.strike) ctx.fillRect(0, -a.size * k * 0.3, tw, th);
          }
          ctx.restore();
        } else if (a.type === "text") {
          ctx.fillStyle = a.color;
          ctx.font = (a.italic ? "italic " : "") + (a.bold ? "800 " : "500 ") + a.size * k + "px " + (a.font || EDIT_FONT);
          ctx.textBaseline = "top";
          const th = Math.max(1, a.size * k * 0.07);
          String(a.text).split("\n").forEach((ln, i) => {
            const yTop = (a.y + i * a.size * 1.28) * k;
            ctx.fillText(ln, a.x * k, yTop);
            const tw = ctx.measureText(ln).width;
            if (a.under) ctx.fillRect(a.x * k, yTop + a.size * k * 1.02, tw, th);
            if (a.strike) ctx.fillRect(a.x * k, yTop + a.size * k * 0.52, tw, th);
          });
        }
      }
    }
    function repaintAnnos() {
      const anno = $("edit-anno") as HTMLCanvasElement;
      if (!anno.width) return;
      const ctx = anno.getContext("2d")!;
      ctx.clearRect(0, 0, anno.width, anno.height);
      const k = anno.width / ED.vp.w;
      const ed = ED.editing;
      if (ED.mode === "retext") {
        ctx.save();
        ctx.strokeStyle = "rgba(27,163,142,.62)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        for (const r of ED.items[ED.page] || []) {
          if (ed && ed.kind === "run" && ed.run === r) continue;
          ctx.save();
          ctx.translate(r.bx * k, r.by * k);
          ctx.rotate(r.angle);
          ctx.strokeRect(0, -r.size * r.asc * k, r.w * k, r.size * (r.asc + r.desc) * k);
          ctx.restore();
        }
        ctx.restore();
      }
      let list = editAnnos();
      if (ed && ed.kind === "anno") list = list.filter((a: any) => a !== ed.anno);
      drawAnnoList(ctx, list, k, true);
      if (ed) {
        if (ed.kind === "run") {
          const r0 = ed.run;
          drawAnnoList(
            ctx,
            [{ type: "retext", text: "", bx: r0.bx, by: r0.by, angle: r0.angle, size: r0.size, w: r0.w, asc: r0.asc, desc: r0.desc, font: r0.font, color: "#000", bg: r0._bg || "#ffffff" }],
            k,
            false,
          );
        } else if (ed.anno.type === "retext") {
          drawAnnoList(ctx, [Object.assign({}, ed.anno, { text: "" })], k, false);
        }
      }
      if (ED.tmp) drawAnnoList(ctx, [ED.tmp], k, true);
    }
    function edPt(e: any) {
      const r = ($("edit-anno") as HTMLCanvasElement).getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (ED.vp.w / r.width),
        y: (e.clientY - r.top) * (ED.vp.h / r.height),
      };
    }
    async function loadTextItems(page: any) {
      const pdfjs = await getPdfjs();
      const tc = await page.getTextContent();
      const vt = page.getViewport({ scale: 1 }).transform;
      const out: any[] = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim() || !it.width) continue;
        const m = pdfjs.Util.transform(vt, it.transform);
        const size = Math.hypot(m[2], m[3]);
        if (size < 1) continue;
        const st = tc.styles[it.fontName] || {};
        out.push({
          bx: m[4],
          by: m[5],
          angle: Math.atan2(m[1], m[0]),
          size,
          w: it.width,
          str: it.str,
          asc: st.ascent || 0.85,
          desc: Math.abs(st.descent || 0.25),
          font: st.fontFamily || "sans-serif",
        });
      }
      return out;
    }
    function inRun(r: any, p: any) {
      const dx = p.x - r.bx,
        dy = p.y - r.by;
      const ca = Math.cos(r.angle),
        sa = Math.sin(r.angle);
      const lx = dx * ca + dy * sa,
        ly = -dx * sa + dy * ca;
      return lx >= -2 && lx <= r.w + 2 && ly >= -r.size * r.asc - 2 && ly <= r.size * r.desc + 2;
    }
    function sampleRun(r: any) {
      const base = $("edit-base") as HTMLCanvasElement,
        kb = base.width / ED.vp.w;
      let bg = "#ffffff",
        fg = "#14151a";
      try {
        const ca = Math.cos(r.angle),
          sa = Math.sin(r.angle);
        const pts = [
          [0, -r.size * r.asc],
          [r.w, -r.size * r.asc],
          [0, r.size * r.desc],
          [r.w, r.size * r.desc],
        ].map(([lx, ly]) => [(r.bx + lx * ca - ly * sa) * kb, (r.by + lx * sa + ly * ca) * kb]);
        const x0 = Math.max(0, Math.floor(Math.min(...pts.map((q) => q[0])))),
          y0 = Math.max(0, Math.floor(Math.min(...pts.map((q) => q[1])))),
          x1 = Math.min(base.width, Math.ceil(Math.max(...pts.map((q) => q[0])))),
          y1 = Math.min(base.height, Math.ceil(Math.max(...pts.map((q) => q[1]))));
        const w = Math.max(1, x1 - x0),
          h = Math.max(1, y1 - y0);
        const d = base.getContext("2d")!.getImageData(x0, y0, w, h).data;
        const step = Math.max(1, Math.round(Math.sqrt((w * h) / 4000)));
        const counts = new Map<number, number>();
        for (let yy = 0; yy < h; yy += step)
          for (let xx = 0; xx < w; xx += step) {
            const i = (yy * w + xx) * 4;
            const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        let bk = 0xfff,
          bc = -1;
        counts.forEach((c, kq) => {
          if (c > bc) {
            bc = c;
            bk = kq;
          }
        });
        const br = ((bk >> 8) & 15) * 17,
          bgr = ((bk >> 4) & 15) * 17,
          bb = (bk & 15) * 17;
        bg = "rgb(" + br + "," + bgr + "," + bb + ")";
        let fd = -1,
          fr = 20,
          fgr = 21,
          fb = 26;
        for (let yy = 0; yy < h; yy += step)
          for (let xx = 0; xx < w; xx += step) {
            const i = (yy * w + xx) * 4;
            const dist = (d[i] - br) ** 2 + (d[i + 1] - bgr) ** 2 + (d[i + 2] - bb) ** 2;
            if (dist > fd) {
              fd = dist;
              fr = d[i];
              fgr = d[i + 1];
              fb = d[i + 2];
            }
          }
        if (fd > 900) fg = "rgb(" + fr + "," + fgr + "," + fb + ")";
      } catch {}
      return { bg, fg };
    }
    function openEditInput(p: any, run?: any, ha?: any) {
      killEditInput(true);
      const stage = $("edit-stage"),
        annoCv = $("edit-anno") as HTMLCanvasElement;
      const r = annoCv.getBoundingClientRect(),
        rs = stage.getBoundingClientRect();
      const k = r.width / ED.vp.w;
      const anno = ha ? ha.a : null;

      if (run) {
        const smp = sampleRun(run);
        run._bg = smp.bg;
        ($("edit-tsize") as HTMLInputElement).value = String(Math.round(run.size * 10) / 10);
        ($("edit-tcolor") as HTMLInputElement).value = rgb2hex(smp.fg);
        ($("edit-font") as HTMLSelectElement).value = fontKeyOf(run.font);
        setFmtToggles(false, false, false, false);
      } else if (anno) {
        ($("edit-tsize") as HTMLInputElement).value = String(Math.round(anno.size * 10) / 10);
        ($("edit-tcolor") as HTMLInputElement).value = /^#/.test(anno.color) ? anno.color : rgb2hex(anno.color);
        ($("edit-font") as HTMLSelectElement).value = anno.fkey || fontKeyOf(anno.font);
        setFmtToggles(anno.bold, anno.italic, anno.under, anno.strike);
      }
      const f = fmtState();

      const ta: any = document.createElement("textarea");
      ta.id = "edit-input";
      ta.className = "edit-input";
      ta.rows = 1;
      ta._pt = p;
      ta._k = k;
      if (run) {
        ta.value = run.str;
        ta._run = run;
        ta._init = { size: f.size, color: f.color, fkey: f.fkey };
      }
      if (anno) {
        ta.value = anno.text;
        ta._anno = anno;
      }
      ta._single = !!(run || (anno && anno.type === "retext"));
      if (ta._single) ta.wrap = "off";
      if (!run && !anno) ta.placeholder = "Type…";

      let ax, ay;
      if (run) {
        ax = run.bx;
        ay = run.by - f.size * run.asc;
      } else if (anno && anno.type === "retext") {
        ax = anno.bx;
        ay = anno.by - f.size * anno.asc;
      } else if (anno) {
        ax = anno.x;
        ay = anno.y;
      } else {
        ax = p.x;
        ay = p.y;
      }
      const leftPx = Math.max(0, Math.min(ax * k, r.width - 24));
      ta.style.left = r.left - rs.left + leftPx + "px";
      ta.style.top = r.top - rs.top + Math.max(0, ay * k) + "px";

      const fit = () => {
        const g = fmtState();
        measCtx.font = cssFontOf(g, g.size * k);
        const lines = (ta.value || ta.placeholder || " ").split("\n");
        const wpx = Math.max(14, ...lines.map((L: string) => measCtx.measureText(L).width)) + g.size * k * 0.6;
        ta.style.width = Math.max(20, Math.min(r.width - leftPx - 2, wpx)) + "px";
        ta.style.height = "auto";
        ta.style.height = Math.max(g.size * k * 1.32, ta.scrollHeight) + "px";
      };
      ta._fit = fit;
      ta.addEventListener("input", fit);
      ta.addEventListener("keydown", (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && (ta._single || !ev.shiftKey)) {
          ev.preventDefault();
          killEditInput(true);
        } else if (ev.key === "Escape") killEditInput(false);
      });
      ta.addEventListener("blur", () =>
        setTimeout(() => {
          const el = document.getElementById("edit-input");
          if (!el) return;
          const ae = document.activeElement as HTMLElement | null;
          if (ae && ae.closest && ae.closest("#edit-opts")) return;
          killEditInput(true);
        }, 0),
      );

      ED.editing = run ? { kind: "run", run } : anno ? { kind: "anno", anno } : null;
      stage.appendChild(ta);
      syncOpenInput();
      repaintAnnos();
      ta.focus();
      setTimeout(() => {
        try {
          ta.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {}
      }, 80);

      let ci = ta.value.length;
      const mf = cssFontOf(f, f.size * k);
      if (run) {
        const dx = p.x - run.bx,
          dy = p.y - run.by;
        const lx = dx * Math.cos(run.angle) + dy * Math.sin(run.angle);
        ci = caretIndex(ta.value, mf, lx * k, run.w * k);
      } else if (anno && anno.type === "retext") {
        ci = caretIndex(ta.value, mf, ha.lx * k, null);
      } else if (anno) {
        const lines = ta.value.split("\n");
        const li = Math.max(0, Math.min(lines.length - 1, Math.floor(ha.ly / (f.size * 1.28))));
        let off = 0;
        for (let i = 0; i < li; i++) off += lines[i].length + 1;
        ci = off + caretIndex(lines[li], mf, ha.lx * k, null);
      }
      try {
        ta.setSelectionRange(ci, ci);
      } catch {}
    }

    /* ---- listeners ---- */
    const modeBtns = $$("#edit-modes [data-mode]");
    const onMode = (b: HTMLElement) => () => {
      killEditInput(true);
      ED.mode = b.dataset.mode;
      modeBtns.forEach((x) => x.classList.toggle("on", x === b));
      repaintAnnos();
    };
    modeBtns.forEach((b) => on(b, "click", onMode(b)));

    const optInputs = ["edit-font", "edit-tsize", "edit-tcolor"].map((id) => $(id));
    optInputs.forEach((el) => on(el, "input", syncOpenInput));
    const fmtBtns = $$("#edit-opts .fmt");
    fmtBtns.forEach((b) => {
      on(b, "pointerdown", (e) => e.preventDefault());
      on(b, "click", () => {
        b.classList.toggle("on");
        b.setAttribute("aria-pressed", String(b.classList.contains("on")));
        syncOpenInput();
      });
    });

    let edDown = false;
    const anno = $("edit-anno");
    const onDown = (e: PointerEvent) => {
      if (!EDITFILE || e.button > 0) return;
      e.preventDefault();
      const p = edPt(e);
      if (ED.mode === "retext" || ED.mode === "text") {
        const ha = hitAnno(p);
        if (ha) {
          openEditInput(p, null, ha);
          return;
        }
        if (ED.mode === "retext") {
          const runs = ED.items[ED.page] || [];
          let hit = null;
          for (let i = runs.length - 1; i >= 0; i--)
            if (inRun(runs[i], p)) {
              hit = runs[i];
              break;
            }
          if (hit) openEditInput(p, hit);
          else cb.current.setStatus("Tap a dashed text box to edit it, or use Add text for empty areas.", "err");
          return;
        }
        openEditInput(p);
        return;
      }
      killEditInput(true);
      edDown = true;
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      const sz = EDIT_SIZES[($("edit-size") as HTMLSelectElement).value];
      ED.tmp =
        ED.mode === "pen"
          ? { type: "pen", color: ($("edit-tcolor") as HTMLInputElement).value, w: sz.pen, pts: [p] }
          : { type: ED.mode, x: p.x, y: p.y, w: 0, h: 0 };
      repaintAnnos();
    };
    const onMove = (e: PointerEvent) => {
      if (edDown && ED.tmp) {
        const p = edPt(e);
        if (ED.tmp.type === "pen") ED.tmp.pts.push(p);
        else {
          ED.tmp.w = p.x - ED.tmp.x;
          ED.tmp.h = p.y - ED.tmp.y;
        }
        repaintAnnos();
        return;
      }
      if (!EDITFILE) return;
      if (ED.mode === "retext" || ED.mode === "text") {
        const p = edPt(e);
        const over = hitAnno(p) || (ED.mode === "retext" && (ED.items[ED.page] || []).some((r0: any) => inRun(r0, p)));
        (e.target as HTMLElement).style.cursor = over || ED.mode === "text" ? "text" : "default";
      } else {
        (e.target as HTMLElement).style.cursor = "crosshair";
      }
    };
    const edFinish = () => {
      if (!edDown) return;
      edDown = false;
      const t = ED.tmp;
      ED.tmp = null;
      if (t && (t.type === "pen" ? t.pts.length > 1 : Math.abs(t.w) > 2 && Math.abs(t.h) > 2)) editAnnos().push(t);
      repaintAnnos();
    };
    on(anno, "pointerdown", onDown as EventListener);
    on(anno, "pointermove", onMove as EventListener);
    on(anno, "pointerup", edFinish);
    on(anno, "pointercancel", edFinish);

    const onPrev = () => showEditPage(ED.page - 1);
    const onNext = () => showEditPage(ED.page + 1);
    const onUndo = () => {
      if (document.getElementById("edit-input")) {
        killEditInput(false);
        return;
      }
      editAnnos().pop();
      repaintAnnos();
    };
    const onClearPg = () => {
      killEditInput(false);
      ED.annos[ED.page] = [];
      repaintAnnos();
    };
    const onGoto = () => {
      const n = parseInt(($("edit-goto") as HTMLInputElement).value, 10);
      if (EDITFILE && n) showEditPage(n - 1);
    };
    on($("edit-prev"), "click", onPrev);
    on($("edit-next"), "click", onNext);
    on($("edit-undo"), "click", onUndo);
    on($("edit-clearpg"), "click", onClearPg);
    on($("edit-goto"), "change", onGoto);

    async function apply() {
      if (!EDITFILE) {
        cb.current.setStatus("Add a PDF first.", "err");
        return;
      }
      killEditInput(true);
      cb.current.clearResults();
      const keys = Object.keys(ED.annos).filter((k) => ED.annos[+k].length);
      if (!keys.length) {
        cb.current.setStatus("Nothing to apply yet — add some edits first.", "err");
        return;
      }
      cb.current.setStatus("Baking edits into the PDF…", "busy");
      try {
        const doc = await PDFDocument.load(EDITFILE.bytes);
        const EXP = 3;
        for (const key of keys) {
          const idx = +key;
          const pg = doc.getPage(idx);
          const pjs = await editPdfjs.getPage(idx + 1);
          const vp = pjs.getViewport({ scale: 1 });
          const cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(vp.width * EXP));
          cv.height = Math.max(1, Math.round(vp.height * EXP));
          drawAnnoList(cv.getContext("2d")!, ED.annos[idx], EXP, false);
          const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), "image/png"));
          const png = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
          const rot = (((pg.getRotation().angle % 360) + 360) % 360);
          const cbx = pg.getCropBox();
          const X = cbx.x,
            Y = cbx.y,
            W = cbx.width,
            H = cbx.height;
          if (rot === 90) pg.drawImage(png, { x: X + W, y: Y, width: H, height: W, rotate: degrees(90) });
          else if (rot === 180) pg.drawImage(png, { x: X + W, y: Y + H, width: W, height: H, rotate: degrees(180) });
          else if (rot === 270) pg.drawImage(png, { x: X, y: Y + H, width: H, height: W, rotate: degrees(270) });
          else pg.drawImage(png, { x: X, y: Y, width: W, height: H });
        }
        const bytes = await doc.save();
        cb.current.deliver(bytes, baseName(EDITFILE.name) + "-edited.pdf");
        cb.current.setStatus(
          "Done — edits flattened onto " + keys.length + " page" + (keys.length !== 1 ? "s" : "") + ".",
          "ok",
        );
      } catch (e) {
        cb.current.setStatus(friendly(e), "err");
      }
    }

    api.current = { init: initEdit, clear: clearEdit, apply };

    return () => {
      clearEdit();
      disposers.forEach((d) => d());
      api.current = null;
    };
  }, []);

  const onFiles = async (files: File[]) => {
    setStatus("Reading " + files[0].name + "…", "busy");
    try {
      const it = await load(files[0]);
      clearResults();
      api.current?.init({ bytes: it.bytes, name: it.name, pageCount: it.pageCount });
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame
      code="EDT"
      title="Edit & annotate"
      desc="Tap existing text to retype it, add new text anywhere, draw, highlight or white-out. Edits are flattened into the PDF when you apply."
    >
      <style>{`
        #edit-modes [data-mode].on,#edit-opts .fmt.on{background:var(--accent);border-color:var(--accent);color:#fff}
        .edit-input{position:absolute;z-index:6;background:transparent;border:0;border-radius:2px;padding:0;margin:0;resize:none;overflow:hidden;line-height:1.28;white-space:pre;caret-color:currentColor;outline:none;box-shadow:0 0 0 1.5px rgba(27,163,142,.7),0 0 0 5px rgba(27,163,142,.18)}
        .edit-input::placeholder{color:rgba(20,21,26,.35)}
      `}</style>

      <div className={file ? "hidden" : ""}>
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="✎"
          title="Drop a PDF here"
          hint="or tap to browse"
          onFiles={onFiles}
        />
      </div>
      <div className={file ? "" : "hidden"}>
        <FileChip
          name={file?.name ?? ""}
          meta={
            file ? file.pageCount + " page" + (file.pageCount !== 1 ? "s" : "") + " · " + fmtSize(file.size) : ""
          }
          onRemove={() => {
            api.current?.clear();
            clear();
            clearResults();
            setStatus("", "");
          }}
        />
      </div>

      {/* editor UI — always in the DOM so the controller can bind to it */}
      <div className={file ? "" : "hidden"}>
        <div id="edit-modes" className="mt-4 flex flex-wrap gap-2">
          <button className={cx(smGhost, "on")} data-mode="retext">✎ Edit text</button>
          <button className={smGhost} data-mode="text">T Add text</button>
          <button className={smGhost} data-mode="pen">✐ Pen</button>
          <button className={smGhost} data-mode="hl">▮ Highlight</button>
          <button className={smGhost} data-mode="wo">▭ White-out</button>
        </div>

        <div id="edit-opts" className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[88px] flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">Font</span>
            <select id="edit-font" className="rounded-lg border-[1.5px] border-border bg-paper px-2 py-1.5 text-[13px]">
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
          </label>
          <label className="flex w-[70px] flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">Size pt</span>
            <input id="edit-tsize" type="number" min={6} max={120} step={1} defaultValue={16} className="rounded-lg border-[1.5px] border-border bg-paper px-2 py-1.5 text-[13px]" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">Color</span>
            <input id="edit-tcolor" type="color" defaultValue="#14151a" className="h-[37px] w-[52px] cursor-pointer rounded-lg border-[1.5px] border-border bg-paper p-[3px]" />
          </label>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">Style</span>
            <div className="flex gap-1.5">
              <button id="edit-b" className={cx(smGhost, "fmt min-w-[34px] justify-center")} title="Bold" aria-pressed="false"><b>B</b></button>
              <button id="edit-i" className={cx(smGhost, "fmt min-w-[34px] justify-center")} title="Italic" aria-pressed="false"><i>I</i></button>
              <button id="edit-u" className={cx(smGhost, "fmt min-w-[34px] justify-center")} title="Underline" aria-pressed="false"><u>U</u></button>
              <button id="edit-st" className={cx(smGhost, "fmt min-w-[34px] justify-center")} title="Strikethrough" aria-pressed="false"><s>S</s></button>
            </div>
          </div>
          <label className="flex min-w-[86px] flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">Pen stroke</span>
            <select id="edit-size" defaultValue="m" className="rounded-lg border-[1.5px] border-border bg-paper px-2 py-1.5 text-[13px]">
              <option value="s">Thin</option>
              <option value="m">Medium</option>
              <option value="l">Thick</option>
            </select>
          </label>
        </div>

        <p id="edit-hint" className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          Tap any text to edit it in place — the cursor lands where you tap. Enter saves, Esc cancels, empty = erase.
          Pen / highlight / white-out: drag. The style bar works live while you type.
        </p>

        <div
          id="edit-stage"
          className="relative mt-3.5 select-none overflow-hidden rounded-[10px] border border-border bg-panel leading-[0] shadow-panel"
          style={{ touchAction: "none" }}
        >
          <canvas id="edit-base" className="block h-auto w-full" />
          <canvas id="edit-anno" className="absolute left-0 top-0 h-full w-full cursor-crosshair" />
        </div>

        <div id="edit-nav" className="mt-3 flex flex-wrap items-center gap-2">
          <button className={smGhost} id="edit-prev">← Prev</button>
          <span className="self-center whitespace-nowrap px-1 font-mono text-[12px] tracking-wide">
            Page{" "}
            <input id="edit-goto" type="number" min={1} defaultValue={1} aria-label="Go to page" className="w-14 rounded border-[1.5px] border-border bg-paper px-1 py-1 text-center font-mono text-[12px]" />{" "}
            / <b id="edit-total">1</b>
          </span>
          <button className={smGhost} id="edit-next">Next →</button>
          <span className="flex-1" />
          <button className={smSolid} id="edit-undo">↩ Undo</button>
          <button className={smGhost} id="edit-clearpg">Clear page</button>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-2.5">
          <button className={btnAccent} onClick={() => api.current?.apply()}>
            Apply &amp; download
          </button>
        </div>
      </div>

      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
