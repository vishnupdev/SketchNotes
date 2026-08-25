"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeCode, encodeCode, inviteLink, CodeError } from "@/lib/rtc/code";
import { buildFrames } from "@/lib/qr/frames";
import { cloneLinkSupported, createCloneSender, type CloneLink } from "@/lib/Clone/link";
import { saveCloneFile } from "@/lib/Clone/drive";
import { takeClone, type TakenClone } from "@/lib/Clone/snapshot";
import {
  CODES_COMFORTABLE_BYTES,
  frameEstimate,
  reachFor,
  ROUTE_MAP,
  TRANSPORTS,
} from "@/lib/Clone/routes";
import type { CloneReceipt, CloneStage, CloneTransport } from "@/lib/Clone/types";
import { useCloneStore } from "@/store/useCloneStore";
import { ContentsSummary } from "@/components/Clone/molecules/ContentsSummary";
import { RoutePicker } from "@/components/Clone/molecules/RoutePicker";
import { CodeOut } from "@/components/Clone/molecules/CodeOut";
import { CodeIn } from "@/components/Clone/molecules/CodeIn";
import { MoveProgress } from "@/components/Clone/molecules/MoveProgress";
import { FramePlayer } from "@/components/SketchNotes/molecules/FramePlayer";
import { DriveIcon, LinkIcon, QrIcon, ShieldCheckIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, formatBytes } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

const TRANSPORT_ICON: Record<CloneTransport, React.ReactNode> = {
  link: <LinkIcon size={16} />,
  drive: <DriveIcon size={16} />,
  codes: <QrIcon size={16} />,
};

/**
 * Cloning *from* this device: pack it up, choose how the two devices are
 * joined, and send it.
 *
 * The snapshot is taken once when the panel opens rather than per transport, so
 * the summary on screen and the bytes that leave are provably the same thing —
 * and switching from a direct link to a file on a USB stick doesn't quietly
 * send a different device state than the one just described.
 *
 * Nothing here outlives the panel. Leaving the tab, switching apps or finishing
 * the clone all unmount it, and the cleanup closes the connection and stops the
 * camera — which is the only guarantee worth making about a live link.
 */
export function SendClonePanel() {
  const device = useCloneStore((s) => s.device);
  const route = useCloneStore((s) => s.route);
  const setRoute = useCloneStore((s) => s.setRoute);
  const wide = useCloneStore((s) => s.wide);
  const setWide = useCloneStore((s) => s.setWide);
  const record = useCloneStore((s) => s.record);

  const [taken, setTaken] = useState<TakenClone | null>(null);
  const [transport, setTransport] = useState<CloneTransport | null>(null);
  const [stage, setStage] = useState<CloneStage>("idle");
  const [myCode, setMyCode] = useState("");
  const [frames, setFrames] = useState<string[]>([]);
  const [moved, setMoved] = useState(0);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<CloneReceipt | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const linkRef = useRef<CloneLink | null>(null);
  /**
   * Whether the far end has confirmed it holds the clone.
   *
   * Once it has, the channel closing is the *end of a successful clone* rather
   * than a failure: the receiving device reloads the moment it writes the clone
   * in, which tears the connection down from its side. Without this, every
   * successful clone would finish by announcing that it had stopped.
   */
  const deliveredRef = useRef(false);

  // Pack this device up as soon as the panel opens: the summary is the first
  // thing worth seeing, and it can't be drawn without reading storage anyway.
  useEffect(() => {
    let cancelled = false;
    void takeClone({ label: device || "This device", platform: navigatorPlatform() }).then((t) => {
      if (!cancelled) setTaken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [device]);

  const cleanup = useCallback(() => {
    linkRef.current?.close();
    linkRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const back = () => {
    cleanup();
    setTransport(null);
    setStage("idle");
    setMyCode("");
    setFrames([]);
    setMoved(0);
    setTotal(0);
    setNote("");
    setReceipt(null);
    setSaved("");
    setError("");
    setBusy(false);
    deliveredRef.current = false;
  };

  /* ------------------------------ transports ---------------------------- */

  /** A direct data channel, over the cable link or over the network. */
  const startLink = async () => {
    if (!taken) return;
    setTransport("link");
    setError("");
    setStage("preparing");
    deliveredRef.current = false;

    let link: CloneLink;
    try {
      link = await createCloneSender(
        reachFor(route, wide),
        taken.snapshot.from,
        taken.snapshot.takenAt,
        {
          onOpen: () => setStage("moving"),
          onProgress: (m, t) => {
            setMoved(m);
            setTotal(t);
          },
          onDelivered: (keys) => {
            deliveredRef.current = true;
            setStage("arrived");
            setNote(`${keys} items are on the other device, intact — it's asking what to do with them.`);
            record({
              direction: "sent",
              route,
              other: "the other device",
              keys,
              bytes: taken.contents.bytes,
            });
          },
          onReceipt: (r) => {
            setStage("applied");
            setReceipt(r);
          },
          onError: (message) => {
            if (deliveredRef.current) return;
            setError(message);
            setStage("failed");
          },
        },
      );
    } catch {
      setError("A direct link couldn't be set up on this device.");
      setStage("failed");
      return;
    }

    linkRef.current = link;
    setMyCode(await encodeCode(link.description));
    setStage("pairing");
  };

  /** The other device's reply — after this the clone goes across by itself. */
  const acceptReply = async (raw: string) => {
    const link = linkRef.current;
    if (!link || !taken) return;
    setBusy(true);
    setError("");
    try {
      await link.accept(await decodeCode(raw));
      setStage("connecting");
      // `send` waits for the channel to open, so a link that never comes up
      // surfaces here as a failure rather than as an exception nobody catches.
      await link.send(taken.json);
    } catch (e) {
      setError(
        e instanceof CodeError
          ? e.message
          : "The link didn't complete. Try a clone file instead — that route always works.",
      );
      setStage("failed");
    } finally {
      setBusy(false);
    }
  };

  /** A file, for a USB stick carried across or a clone kept aside. */
  const writeFile = async () => {
    if (!taken) return;
    setTransport("drive");
    setError("");
    setBusy(true);
    try {
      const outcome = await saveCloneFile(taken.json, device || "device", taken.snapshot.takenAt);
      if (outcome.kind === "cancelled") {
        setTransport(null);
        return;
      }
      setSaved(
        outcome.kind === "written"
          ? `Written to ${outcome.name}.`
          : `Downloaded as ${outcome.name}.`,
      );
      setStage("applied");
      record({
        direction: "sent",
        route,
        other: "a clone file",
        keys: taken.contents.keys,
        bytes: taken.contents.bytes,
      });
    } catch {
      setError("The clone file couldn't be written.");
      setStage("failed");
    } finally {
      setBusy(false);
    }
  };

  /** A loop of QR codes — no network, no cable, nothing but a camera. */
  const showCodes = async () => {
    if (!taken) return;
    setTransport("codes");
    setError("");
    setStage("preparing");
    setFrames(await buildFrames(taken.json, "data"));
    setStage("moving");
    setNote("");
  };

  /* --------------------------------- views ------------------------------ */

  if (!taken) {
    return (
      <p role="status" className="text-[12.5px] text-ink-soft">
        Reading what this device holds…
      </p>
    );
  }

  if (transport === null) {
    const info = ROUTE_MAP[route];
    const codeFrames = frameEstimate(taken.contents.bytes);
    const bulky = taken.contents.bytes > CODES_COMFORTABLE_BYTES;

    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Copy this whole device — every app&apos;s data and every workspace setting — onto another
          one. Nothing is uploaded and there is no account: the clone goes straight from here to
          there, down whichever route you have.
        </p>

        <ContentsSummary
          rows={taken.contents.rows}
          keys={taken.contents.keys}
          bytes={taken.contents.bytes}
          skipped={taken.contents.skipped}
          title="What this device would send"
        />

        <RoutePicker route={route} onRoute={setRoute} wide={wide} onWide={setWide} />

        <div className="flex flex-col gap-2">
          {info.transports.map((id) => {
            const t = TRANSPORTS[id];
            const disabled = id === "link" && !cloneLinkSupported();
            return (
              <button
                key={id}
                type="button"
                disabled={disabled || taken.contents.keys === 0}
                onClick={() => {
                  if (id === "link") void startLink();
                  else if (id === "drive") void writeFile();
                  else void showCodes();
                }}
                className="flex items-start gap-3 rounded-xl border border-border bg-panel p-3 text-left transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                <span aria-hidden className="mt-0.5 flex-none text-accent">
                  {TRANSPORT_ICON[id]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">
                    {t.label}
                    {disabled && " — not available in this browser"}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
                    {t.blurb}{" "}
                    {id === "codes"
                      ? `About ${codeFrames} codes at ${formatBytes(taken.contents.bytes)}${
                          bulky ? " — slow at this size; a clone file is far quicker." : "."
                        }`
                      : t.speed + "."}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={back} className={cx(BTN, "self-start")}>
        ← Choose another route
      </button>

      {transport === "link" && (
        <>
          {/* The introduction is over once the clone is across — leaving the
              codes up would invite someone to pair a second time with a link
              that has already done its job. */}
          {myCode && stage !== "arrived" && stage !== "applied" && (
            <>
              <CodeOut
                code={myCode}
                link={inviteLink(window.location.origin, "/clone", myCode)}
                kind="offer"
                qrFirst={route !== "network" || !wide}
                title="Show this to the other device"
                hint={
                  route === "cable"
                    ? "Open Clone → Receive on the other device and scan this, or paste the code there. Nothing leaves the cable."
                    : "Open Clone → Receive on the other device and scan this, or send it the link. The code sits after the # so it never reaches a server."
                }
              />
              <CodeIn
                title="Then take its reply"
                hint="The other device answers with a code of its own. Scan it or paste it here, and the clone goes across."
                label="Connect and send"
                busy={busy}
                onCode={(code) => void acceptReply(code)}
              />
            </>
          )}

          <MoveProgress stage={stage} moved={moved} total={total} note={note} />

          {receipt && (
            <div className="flex items-start gap-3 rounded-2xl border border-accent bg-accent-soft p-3.5">
              <span aria-hidden className="mt-0.5 flex-none text-accent">
                <ShieldCheckIcon size={18} />
              </span>
              <p className="text-[12.5px] leading-relaxed">
                <span className="font-semibold">
                  {receipt.device} has it — {receipt.written}{" "}
                  {receipt.written === 1 ? "item" : "items"} written
                  {receipt.removed > 0
                    ? `, ${receipt.removed} replaced outright`
                    : ""}
                  .
                </span>{" "}
                {receipt.mode === "replace"
                  ? "That device is now a copy of this one."
                  : "The clone was added alongside what was already there."}
              </p>
            </div>
          )}
        </>
      )}

      {transport === "drive" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-paper p-3.5">
          <p className="text-[13px] font-semibold">Clone file</p>
          {saved ? (
            <>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                {saved} Plug the drive into the other device, open Clone → Receive there, and choose
                &quot;From a clone file&quot;.
              </p>
              <button type="button" onClick={() => void writeFile()} className={cx(BTN, "self-start")}>
                <DriveIcon size={15} />
                Write another copy
              </button>
            </>
          ) : (
            <p role="status" className="text-[12.5px] text-ink-soft">
              Packing the clone…
            </p>
          )}
        </div>
      )}

      {transport === "codes" && frames.length > 0 && (
        <>
          <FramePlayer
            frames={frames}
            caption="Open Clone → Receive on the other device and hold its camera here until it says it has every part."
          />
          <p className="text-[12px] leading-relaxed text-ink-soft">
            The codes loop, so parts can be read in any order and as many times as needed. Nothing
            is transmitted — the other device is simply reading this screen.
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A short platform hint to travel with the clone. Never an identifier. */
function navigatorPlatform(): string {
  if (typeof navigator === "undefined") return "";
  const ua = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return ua?.platform ?? "";
}
