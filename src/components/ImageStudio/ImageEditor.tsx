"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXT,
  MIMES,
  PRESETS,
  baseName,
  download,
  encodeToTarget,
  fmtSize,
  isLossy,
  loadImage,
  renderBlob,
  type Crop,
  type LoadedImage,
} from "@/lib/image/helpers";
import { cx } from "@/lib/utils";
import { CropStage } from "@/components/ImageStudio/CropStage";

const ASPECTS: { key: string; label: string }[] = [
  { key: "free", label: "Free" },
  { key: "orig", label: "Original" },
  { key: "1:1", label: "1:1" },
  { key: "4:3", label: "4:3" },
  { key: "3:4", label: "3:4" },
  { key: "16:9", label: "16:9" },
  { key: "9:16", label: "9:16" },
];

const TARGET_PRESETS: { kb: number; label: string }[] = [
  { kb: 50, label: "50 KB" },
  { kb: 100, label: "100 KB" },
  { kb: 200, label: "200 KB" },
  { kb: 500, label: "500 KB" },
  { kb: 1024, label: "1 MB" },
];

const aspectValue = (key: string, img: LoadedImage): number | null => {
  if (key === "free") return null;
  if (key === "orig") return img.w / img.h;
  const [a, b] = key.split(":").map(Number);
  return a / b;
};

/** Largest centred rectangle of the given aspect that fits WxH. */
function centeredRect(W: number, H: number, asp: number): Crop {
  let w = W,
    h = W / asp;
  if (h > H) {
    h = H;
    w = H * asp;
  }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

const field = "flex flex-col gap-1.5";
const fieldLabel = "font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft";
const input =
  "w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[14px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
const chip = (on: boolean) =>
  cx(
    "rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
    on ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel text-text hover:border-accent",
  );

interface Preview {
  url: string;
  size: number;
  w: number;
  h: number;
  blob: Blob;
}

export function ImageEditor() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [aspectKey, setAspectKey] = useState("free");
  const [ow, setOw] = useState(1);
  const [oh, setOh] = useState(1);
  const [format, setFormat] = useState("jpeg");
  const [quality, setQuality] = useState(85);
  const [targetOn, setTargetOn] = useState(false);
  const [targetKB, setTargetKB] = useState(200);
  const [preset, setPreset] = useState("custom");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const aspect = img ? aspectValue(aspectKey, img) : null;

  const openImage = useCallback(async (file: File) => {
    setErr("");
    try {
      const it = await loadImage(file);
      setImg((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return it;
      });
      setCrop({ x: 0, y: 0, w: it.w, h: it.h });
      setAspectKey("free");
      setOw(it.w);
      setOh(it.h);
      setPreset("custom");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  // Live output preview (debounced), honouring the target-size mode.
  useEffect(() => {
    if (!img) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const mime = MIMES[format];
        let res: { blob: Blob; w: number; h: number };
        if (targetOn) {
          res = await encodeToTarget(img.el, crop, ow, oh, mime, Math.max(5, targetKB) * 1024);
        } else {
          const blob = await renderBlob(img.el, crop, ow, oh, mime, quality / 100);
          res = { blob, w: Math.round(ow), h: Math.round(oh) };
        }
        if (cancelled) return;
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(res.blob);
        previewUrlRef.current = url;
        setPreview({ url, size: res.blob.size, w: res.w, h: res.h, blob: res.blob });
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [img, crop, ow, oh, format, quality, targetOn, targetKB]);

  // cleanup on unmount
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const chooseAspect = (key: string) => {
    if (!img) return;
    setAspectKey(key);
    setPreset("custom");
    const asp = aspectValue(key, img);
    if (asp) {
      const c = centeredRect(img.w, img.h, asp);
      setCrop(c);
      setOw(Math.round(c.w));
      setOh(Math.round(c.h));
    }
  };

  // keep output aspect matched to the crop (avoids distortion) as it's dragged
  const onCrop = (c: Crop) => {
    setCrop(c);
    setPreset("custom");
    setOh(Math.max(1, Math.round(ow * (c.h / c.w))));
  };

  const editW = (v: number) => {
    const cw = crop.w / crop.h;
    setOw(v);
    setOh(Math.max(1, Math.round(v / cw)));
    setPreset("custom");
  };
  const editH = (v: number) => {
    const cw = crop.w / crop.h;
    setOh(v);
    setOw(Math.max(1, Math.round(v * cw)));
    setPreset("custom");
  };

  const applyPreset = (id: string) => {
    setPreset(id);
    if (!img) return;
    const p = PRESETS.find((x) => x.id === id);
    if (!p || id === "custom") return;
    if (p.format) setFormat(p.format);
    if (p.maxKB) {
      setTargetOn(true);
      setTargetKB(p.maxKB);
    } else {
      setTargetOn(false);
    }
    if (p.w && p.h) {
      const asp = p.w / p.h;
      const c = centeredRect(img.w, img.h, asp);
      setCrop(c);
      setAspectKey("custom");
      setOw(p.w);
      setOh(p.h);
    } else if (p.w) {
      // max-width, keep original ratio
      setCrop({ x: 0, y: 0, w: img.w, h: img.h });
      setAspectKey("orig");
      const w = Math.min(p.w, img.w);
      setOw(w);
      setOh(Math.round((w * img.h) / img.w));
    }
  };

  const doDownload = async () => {
    if (!img || !preview) return;
    download(preview.blob, `${baseName(img.name)}-${preview.w}x${preview.h}.${EXT[format]}`);
  };

  const removeImg = () => {
    if (img) URL.revokeObjectURL(img.url);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImg(null);
    setPreview(null);
    setErr("");
  };

  if (!img) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
          if (f) openImage(f);
        }}
        className={cx(
          "cursor-pointer rounded-2xl border-2 border-dashed px-4 py-20 text-center transition-colors",
          dragOver ? "border-accent bg-accent-soft" : "border-ink-soft/50 hover:border-accent hover:bg-accent-soft/50",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) openImage(f);
            e.target.value = "";
          }}
        />
        <div className="mb-3 text-[34px]">🖼</div>
        <b className="mb-1 block font-mono text-[13px] tracking-wide">Drop an image here</b>
        <span className="text-[12.5px] text-ink-soft">or tap to browse — JPG, PNG, WebP, GIF</span>
        {err && <p className="mt-3 font-mono text-[12px] text-danger">{err}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
      {/* preview + crop */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            Source · {img.w}×{img.h} · {fmtSize(img.size)}
          </span>
          <button
            onClick={removeImg}
            className="rounded-lg border border-border bg-panel px-2.5 py-1 text-[12px] hover:border-danger hover:text-danger"
          >
            Remove
          </button>
        </div>
        <CropStage url={img.url} imgW={img.w} imgH={img.h} crop={crop} setCrop={onCrop} aspect={aspect} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          Drag the box to move, corners to resize. Pick an aspect ratio to lock its shape.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-col gap-4">
        <label className={field}>
          <span className={fieldLabel}>Upload preset</span>
          <select className={input} value={preset} onChange={(e) => applyPreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.group === "General" ? p.label : `${p.group} · ${p.label}`}
              </option>
            ))}
          </select>
        </label>

        <div className={field}>
          <span className={fieldLabel}>Aspect ratio</span>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button key={a.key} className={chip(aspectKey === a.key)} onClick={() => chooseAspect(a.key)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-3">
          <label className={field} style={{ flex: 1 }}>
            <span className={fieldLabel}>Width (px)</span>
            <input
              type="number"
              min={1}
              className={input}
              value={ow}
              onChange={(e) => editW(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </label>
          <span className="pb-2 text-ink-soft">×</span>
          <label className={field} style={{ flex: 1 }}>
            <span className={fieldLabel}>Height (px)</span>
            <input
              type="number"
              min={1}
              className={input}
              value={oh}
              onChange={(e) => editH(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </label>
        </div>

        <div className="flex items-end gap-3">
          <label className={field} style={{ flex: 1 }}>
            <span className={fieldLabel}>Format</span>
            <select className={input} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
          <label className={field} style={{ flex: 1.4, opacity: isLossy(format) && !targetOn ? 1 : 0.4 }}>
            <span className={fieldLabel}>Quality {quality}%</span>
            <input
              type="range"
              min={30}
              max={95}
              className="accent-accent"
              value={quality}
              disabled={!isLossy(format) || targetOn}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            />
          </label>
        </div>

        <div className="rounded-xl border border-border bg-paper p-3">
          <label className="flex items-center gap-2 text-[13px] font-semibold">
            <input type="checkbox" className="accent-accent" checked={targetOn} onChange={(e) => setTargetOn(e.target.checked)} />
            Compress to a target file size
          </label>
          {targetOn && (
            <>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {TARGET_PRESETS.map((t) => (
                  <button key={t.kb} className={chip(targetKB === t.kb)} onClick={() => setTargetKB(t.kb)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  className={input}
                  style={{ maxWidth: 120 }}
                  value={targetKB}
                  onChange={(e) => setTargetKB(Math.max(5, parseInt(e.target.value, 10) || 5))}
                />
                <span className="text-[13px] text-ink-soft">KB max</span>
                {!isLossy(format) && (
                  <span className="text-[11px] text-ink-soft">(PNG: met by downscaling)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* result */}
        <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-soft">Output</div>
              <div className="mt-1 text-[15px] font-bold">
                {preview ? `${preview.w}×${preview.h}` : `${ow}×${oh}`} ·{" "}
                <span className={preview && targetOn && preview.size > targetKB * 1024 ? "text-danger" : "text-accent"}>
                  {busy ? "…" : preview ? fmtSize(preview.size) : "—"}
                </span>
              </div>
            </div>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="max-h-14 max-w-[90px] rounded-md border border-border" />
            )}
          </div>
          <button
            onClick={doDownload}
            disabled={!preview || busy}
            className="mt-3 w-full rounded-[10px] border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-panel transition hover:-translate-y-px active:translate-y-px disabled:opacity-40"
          >
            ⬇ Download {format.toUpperCase()}
          </button>
          {err && <p className="mt-2 font-mono text-[12px] text-danger">{err}</p>}
        </div>
      </div>
    </div>
  );
}
