"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDocument } from "@/lib/backup";
import { acceptFrame, buildFrames, newCollector, newSession } from "@/lib/qr/frames";
import { pickEntries, readSendGroups, groupId, type SendGroup } from "@/lib/Handoff/select";
import { createSender, webrtcSupported, type HandoffLink } from "@/lib/Handoff/webrtc";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { DataPicker } from "@/components/Handoff/molecules/DataPicker";
import { FramePlayer } from "@/components/Handoff/molecules/FramePlayer";
import { cx, formatBytes } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

type Transport = "codes" | "link";
type Stage = "pick" | "showing" | "linking" | "sent";

/**
 * The sending half: choose what to send, then hold the screen up to the other
 * device.
 *
 * Two transports, and the default is the plain one. A chain of QR codes needs
 * nothing but a camera on the receiving device, works between any two browsers,
 * and never touches a network — it is simply slow for large data. The fast link
 * opens a direct connection instead, using the same codes to exchange the
 * connection details, and is offered as the choice for anything big.
 */
export function SendPanel() {
  const [groups, setGroups] = useState<SendGroup[]>([]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [transport, setTransport] = useState<Transport>("codes");
  const [stage, setStage] = useState<Stage>("pick");
  const [frames, setFrames] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const linkRef = useRef<HandoffLink | null>(null);
  const collectorRef = useRef(newCollector());

  useEffect(() => {
    void readSendGroups().then(({ groups: g, entries: e }) => {
      setGroups(g);
      setEntries(e);
      // Nothing pre-selected: sending is an explicit act, and the first row is
      // whatever happens to be largest.
      setChosen(new Set());
    });
  }, []);

  const cleanup = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    linkRef.current?.close();
    linkRef.current = null;
  }, []);

  // Nothing survives leaving this panel: no camera, no open connection.
  useEffect(() => cleanup, [cleanup]);

  const bundle = useMemo(() => {
    if (chosen.size === 0) return null;
    return buildDocument(pickEntries(entries, groups, chosen));
  }, [chosen, entries, groups]);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const back = () => {
    cleanup();
    setStage("pick");
    setFrames([]);
    setStatus("");
    setError("");
  };

  /** Transport 1: show the document itself as a loop of codes. */
  const showCodes = async () => {
    if (!bundle) return;
    setError("");
    setFrames(await buildFrames(bundle.json, "data"));
    setStage("showing");
    setStatus("");
  };

  /** Transport 2: show an offer, watch for the answer, then transfer. */
  const startLink = async () => {
    if (!bundle) return;
    setError("");
    setStatus("Preparing a direct link…");
    setStage("linking");
    collectorRef.current = newCollector();

    let link: HandoffLink;
    try {
      link = await createSender({
        onOpen: () => setStatus("Connected — sending…"),
        onProgress: (fraction) => {
          if (fraction >= 0) setStatus(`Sending… ${Math.round(fraction * 100)}%`);
        },
        onError: (message) => setError(message),
      });
    } catch {
      setError("A direct link couldn't be set up on this device.");
      setStage("pick");
      return;
    }
    linkRef.current = link;

    const session = newSession();
    setFrames(await buildFrames(link.description, "offer", session));
    setStatus("Show this to the other device, then point this camera at its reply.");

    // The sender needs a camera too, for exactly one thing: reading the answer.
    const video = videoRef.current;
    if (!video) return;
    scannerRef.current = await startScanner({
      video,
      continuous: true,
      onError: (message) => setError(message),
      onResult: (text) => {
        void (async () => {
          const result = await acceptFrame(collectorRef.current, text);
          if (result.status === "progress") {
            setStatus(`Reading the reply… ${result.received} of ${result.total} parts`);
            return;
          }
          if (result.status === "failed") {
            setError(result.reason);
            return;
          }
          if (result.status !== "complete" || result.kind !== "answer") return;

          scannerRef.current?.stop();
          scannerRef.current = null;
          setStatus("Reply received — connecting…");
          try {
            await link.accept(result.payload);
            setStatus("Connecting…");
            // `send` waits for the channel to open, so a link that never comes
            // up surfaces here as a failure rather than as an exception.
            await link.send(bundle.json);
            setStage("sent");
            setStatus("Sent. The other device will ask what to do with it.");
          } catch {
            setError("The direct link didn't complete. Try the codes instead — they always work.");
          }
        })();
      },
    });
  };

  const bytes = bundle ? new TextEncoder().encode(bundle.json).length : 0;
  const heavy = bytes > 40_000;

  if (stage === "pick") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Send what this browser holds to another device — no account, no upload, no cable. Pick
          what to send, then hold the code up to the other device&apos;s camera.
        </p>

        <DataPicker
          groups={groups}
          chosen={chosen}
          onToggle={toggle}
          onAll={() => setChosen(new Set(groups.map(groupId)))}
          onNone={() => setChosen(new Set())}
        />

        {bundle && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-paper p-3.5">
            <p className="text-[12.5px]">
              {formatBytes(bytes)} to send
              {heavy
                ? " — that's a lot for codes alone. A direct link will be much quicker."
                : " — a few codes; the receiving device reads them straight off this screen."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransport("codes");
                  void showCodes();
                }}
                className={heavy ? BTN : BTN_ACCENT}
              >
                Show codes
              </button>
              {webrtcSupported() && (
                <button
                  type="button"
                  onClick={() => {
                    setTransport("link");
                    void startLink();
                  }}
                  className={heavy ? BTN_ACCENT : BTN}
                >
                  Direct link (faster)
                </button>
              )}
            </div>
            <p className="text-[12px] leading-relaxed text-ink-soft">
              A direct link needs both devices on the same network and a camera on each — it swaps
              connection details by code, then sends everything at once. Codes alone need a camera
              only on the receiving device and no network at all.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={back} className={cx(BTN, "self-start")}>
        ← Choose something else
      </button>

      <FramePlayer
        frames={frames}
        caption={
          transport === "link"
            ? "Connection details — open Handoff → Receive on the other device and scan this."
            : "Open Handoff → Receive on the other device and point it at this screen until it says it has every part."
        }
      />

      {transport === "link" && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Waiting for the other device&apos;s reply
          </p>
          <div className="aspect-video w-full max-w-64 overflow-hidden rounded-xl border border-border bg-paper">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera, reading the other device's reply"
              className="size-full object-cover"
            />
          </div>
        </div>
      )}

      {status && (
        <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
