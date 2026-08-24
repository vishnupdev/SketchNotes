"use client";

import { useMemo, useState } from "react";
import { useQrStore } from "@/store/useQrStore";
import { buildPayload, type QrFields } from "@/lib/qr/payload";
import { qrPngBlob, qrSvg } from "@/lib/qr/encode";
import { QR_ECCS, QR_ECC_HINT, QR_ECC_SHORT, QR_KINDS, QR_KIND_LABEL } from "@/lib/qr/types";
import { QrPreview } from "@/components/QrTool/molecules/QrPreview";
import { saveBlob } from "@/lib/download";
import { cx } from "@/lib/utils";
import { CheckIcon, CopyIcon, DownloadIcon } from "@/components/SketchNotes/atoms/icons";

const input =
  "w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[14px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
const label = "font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft";
const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/** One labelled field. */
function Field({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className={label}>{name}</span>
      {children}
    </label>
  );
}

const SIZES = [256, 512, 1024];

/**
 * Make a code.
 *
 * The kinds are the ones a phone camera actually *acts* on — a link opens, a
 * Wi-Fi code joins the network, a contact offers to be saved — so the app writes
 * the real formats (`WIFI:`, vCard, `mailto:`) rather than putting a description
 * in a text code and hoping. Everything is built and drawn locally; nothing is
 * sent anywhere to be rendered.
 */
export function CreatePanel() {
  const kind = useQrStore((s) => s.kind);
  const setKind = useQrStore((s) => s.setKind);
  const ecc = useQrStore((s) => s.ecc);
  const setEcc = useQrStore((s) => s.setEcc);
  const size = useQrStore((s) => s.size);
  const setSize = useQrStore((s) => s.setSize);
  const remember = useQrStore((s) => s.remember);

  const [fields, setFields] = useState<QrFields>({ security: "WPA" });
  const [copied, setCopied] = useState(false);

  const set = (patch: Partial<QrFields>) => setFields((f) => ({ ...f, ...patch }));
  const payload = useMemo(() => buildPayload(kind, fields), [kind, fields]);

  const saveAs = async (format: "png" | "svg") => {
    if (!payload) return;
    // Remembered on save rather than as it is typed: every keystroke would
    // otherwise fill the history with half-finished codes.
    remember(payload, "created");
    if (format === "png") {
      saveBlob(await qrPngBlob(payload, { size, ecc }), `qr-${kind}.png`);
      return;
    }
    saveBlob(new Blob([await qrSvg(payload, { ecc })], { type: "image/svg+xml" }), `qr-${kind}.svg`);
  };

  const copy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the payload is shown below and selectable */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* What kind of code. A scrolling row of chips rather than a select, so
          the choices are visible on a phone without opening anything. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {QR_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-current={k === kind}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              k === kind
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {QR_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 min-[720px]:grid-cols-[1fr_20rem] min-[720px]:items-start">
        <div className="flex flex-col gap-3">
          {kind === "text" && (
            <Field name="Text">
              <textarea
                rows={4}
                value={fields.text ?? ""}
                onChange={(e) => set({ text: e.target.value })}
                className={cx(input, "resize-y")}
                placeholder="Anything at all"
              />
            </Field>
          )}

          {kind === "link" && (
            <Field name="Address">
              <input
                type="url"
                inputMode="url"
                value={fields.url ?? ""}
                onChange={(e) => set({ url: e.target.value })}
                className={input}
                placeholder="example.com/page"
              />
            </Field>
          )}

          {kind === "wifi" && (
            <>
              <div className="flex flex-wrap gap-3">
                <Field name="Network name (SSID)">
                  <input
                    value={fields.ssid ?? ""}
                    onChange={(e) => set({ ssid: e.target.value })}
                    className={input}
                    placeholder="Home-WiFi"
                  />
                </Field>
                <Field name="Security">
                  <select
                    value={fields.security ?? "WPA"}
                    onChange={(e) => set({ security: e.target.value as QrFields["security"] })}
                    className={input}
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Open (no password)</option>
                  </select>
                </Field>
              </div>
              {fields.security !== "nopass" && (
                <Field name="Password">
                  <input
                    value={fields.password ?? ""}
                    onChange={(e) => set({ password: e.target.value })}
                    className={input}
                    autoComplete="off"
                  />
                </Field>
              )}
              <label className="flex items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={fields.hidden ?? false}
                  onChange={(e) => set({ hidden: e.target.checked })}
                  className="size-4 accent-accent"
                />
                Hidden network
              </label>
              <p className="text-[12px] leading-relaxed text-ink-soft">
                A Wi-Fi code carries the password in plain text — anyone who can photograph the code
                can read it. Print it for guests, don&apos;t post it publicly.
              </p>
            </>
          )}

          {kind === "email" && (
            <>
              <Field name="To">
                <input
                  type="email"
                  value={fields.email ?? ""}
                  onChange={(e) => set({ email: e.target.value })}
                  className={input}
                  placeholder="name@example.com"
                />
              </Field>
              <Field name="Subject">
                <input
                  value={fields.subject ?? ""}
                  onChange={(e) => set({ subject: e.target.value })}
                  className={input}
                />
              </Field>
              <Field name="Message">
                <textarea
                  rows={3}
                  value={fields.body ?? ""}
                  onChange={(e) => set({ body: e.target.value })}
                  className={cx(input, "resize-y")}
                />
              </Field>
            </>
          )}

          {(kind === "phone" || kind === "sms") && (
            <>
              <Field name="Number">
                <input
                  type="tel"
                  inputMode="tel"
                  value={fields.phone ?? ""}
                  onChange={(e) => set({ phone: e.target.value })}
                  className={input}
                  placeholder="+91 98765 43210"
                />
              </Field>
              {kind === "sms" && (
                <Field name="Message">
                  <textarea
                    rows={3}
                    value={fields.message ?? ""}
                    onChange={(e) => set({ message: e.target.value })}
                    className={cx(input, "resize-y")}
                  />
                </Field>
              )}
            </>
          )}

          {kind === "geo" && (
            <div className="flex flex-wrap gap-3">
              <Field name="Latitude">
                <input
                  inputMode="decimal"
                  value={fields.lat ?? ""}
                  onChange={(e) => set({ lat: e.target.value })}
                  className={input}
                  placeholder="10.0261"
                />
              </Field>
              <Field name="Longitude">
                <input
                  inputMode="decimal"
                  value={fields.lon ?? ""}
                  onChange={(e) => set({ lon: e.target.value })}
                  className={input}
                  placeholder="76.3125"
                />
              </Field>
            </div>
          )}

          {kind === "contact" && (
            <>
              <div className="flex flex-wrap gap-3">
                <Field name="Name">
                  <input
                    value={fields.name ?? ""}
                    onChange={(e) => set({ name: e.target.value })}
                    className={input}
                  />
                </Field>
                <Field name="Organisation">
                  <input
                    value={fields.org ?? ""}
                    onChange={(e) => set({ org: e.target.value })}
                    className={input}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <Field name="Phone">
                  <input
                    type="tel"
                    value={fields.phone ?? ""}
                    onChange={(e) => set({ phone: e.target.value })}
                    className={input}
                  />
                </Field>
                <Field name="Email">
                  <input
                    type="email"
                    value={fields.email ?? ""}
                    onChange={(e) => set({ email: e.target.value })}
                    className={input}
                  />
                </Field>
              </div>
              <Field name="Website">
                <input
                  value={fields.url ?? ""}
                  onChange={(e) => set({ url: e.target.value })}
                  className={input}
                  placeholder="example.com"
                />
              </Field>
            </>
          )}

          {/* Output settings, shared by every kind. */}
          <div className="flex flex-wrap gap-3 border-t border-border pt-3">
            <Field name="Error correction">
              <select
                value={ecc}
                onChange={(e) => setEcc(e.target.value as (typeof QR_ECCS)[number])}
                className={input}
                title={QR_ECC_HINT[ecc]}
              >
                {QR_ECCS.map((level) => (
                  <option key={level} value={level}>
                    {level} — {QR_ECC_SHORT[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Saved size">
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className={input}
              >
                {SIZES.map((px) => (
                  <option key={px} value={px}>
                    {px} × {px} px
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <QrPreview text={payload} size={size} ecc={ecc} />

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void saveAs("png")}
              disabled={!payload}
              className={BTN_ACCENT}
            >
              <DownloadIcon size={15} />
              PNG
            </button>
            <button
              type="button"
              onClick={() => void saveAs("svg")}
              disabled={!payload}
              className={BTN}
            >
              <DownloadIcon size={15} />
              SVG
            </button>
            <button type="button" onClick={() => void copy()} disabled={!payload} className={BTN}>
              {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>

          {payload && (
            <details className="rounded-xl border border-border bg-paper p-3">
              <summary className="cursor-pointer text-[12.5px] font-semibold">
                What the code actually says
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-[11.5px] text-ink-soft">
                {payload}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
