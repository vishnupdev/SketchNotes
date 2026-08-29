"use client";

import { useCallback, useEffect } from "react";
import { useSatelliteStore } from "@/store/useSatelliteStore";

/**
 * Whether this browser can locate the device at all. Read rather than assumed:
 * an insecure origin and a locked-down browser both remove the API entirely.
 */
const geolocationSupported = (): boolean =>
  typeof navigator !== "undefined" && "geolocation" in navigator;

/**
 * Runs the position watch. **Mount this exactly once**, from the app root.
 *
 * The split between this and {@link useLivePosition} exists because two places
 * now offer to locate you — the control on the map and the button in the Live
 * tab — and a hook that both owned the watch and exposed the controls would
 * start a *second* `watchPosition` the moment both were on screen. Two watches
 * means two GPS consumers, double the battery, and two streams of fixes racing
 * each other into the same store. One owner, many callers.
 *
 * A watch rather than a one-off read, because the app's claim is a *live* view:
 * every new fix moves the marker, and with `follow` on the map comes with it.
 * High accuracy is requested, which on a phone means GPS rather than the
 * network's guess — the difference between a dot on your street and a dot on
 * your city.
 *
 * Everything is torn down on unmount, and the workspace unmounts an app when you
 * leave it (`AppFrame` in `Workspace.tsx`), so switching apps is what stops the
 * watch. Nothing keeps following you into another tool.
 */
export function useLivePositionWatch(): void {
  const tracking = useSatelliteStore((s) => s.tracking);
  const setTracking = useSatelliteStore((s) => s.setTracking);
  const setFix = useSatelliteStore((s) => s.setFix);
  const setFixError = useSatelliteStore((s) => s.setFixError);

  useEffect(() => {
    if (!tracking) return;
    if (!geolocationSupported()) {
      setFixError("This browser has no location service.");
      setTracking(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        setFix({
          lat: c.latitude,
          lon: c.longitude,
          accuracy: Number.isFinite(c.accuracy) ? c.accuracy : 0,
          speed: Number.isFinite(c.speed as number) ? c.speed : null,
          heading: Number.isFinite(c.heading as number) ? c.heading : null,
          altitude: Number.isFinite(c.altitude as number) ? c.altitude : null,
          ts: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        // The three failures are genuinely different problems with genuinely
        // different fixes, so they are never collapsed into "location failed".
        setFixError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser's site settings, then try again."
            : err.code === err.POSITION_UNAVAILABLE
              ? "No position available — the device could not get a fix. Indoors, this usually means moving near a window."
              : "Locating timed out. Try again with a clearer view of the sky.",
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [tracking, setFix, setFixError, setTracking]);
}

export interface LivePositionControls {
  /** False when the browser has no geolocation API to offer. */
  supported: boolean;
  /** A watch is running — which is not the same as having a fix yet. */
  tracking: boolean;
  /** True between asking and the first fix landing: the permission prompt sits here. */
  locating: boolean;
  /** Ask for the device's position, clearing any previous failure. */
  start: () => void;
  /** Stop the watch and release the GPS. */
  stop: () => void;
  /** Start if idle, stop if running — what a single control needs. */
  toggle: () => void;
}

/**
 * The controls for the position watch, safe to call from anywhere. Reads state
 * and issues intents; the watch itself belongs to {@link useLivePositionWatch}.
 */
export function useLivePosition(): LivePositionControls {
  const tracking = useSatelliteStore((s) => s.tracking);
  const fix = useSatelliteStore((s) => s.fix);
  const setTracking = useSatelliteStore((s) => s.setTracking);
  const setFixError = useSatelliteStore((s) => s.setFixError);
  const requestCentreOnFix = useSatelliteStore((s) => s.requestCentreOnFix);

  const start = useCallback(() => {
    setFixError(null);
    // Asking to be located is asking to be shown, so the first fix moves the
    // map. Without this the button acquires a position in silence and leaves you
    // looking at wherever you already were — which reads as nothing happening.
    requestCentreOnFix();
    setTracking(true);
  }, [setFixError, setTracking, requestCentreOnFix]);

  const stop = useCallback(() => setTracking(false), [setTracking]);

  const toggle = useCallback(() => {
    if (tracking) stop();
    else start();
  }, [tracking, start, stop]);

  return {
    supported: geolocationSupported(),
    tracking,
    locating: tracking && fix === null,
    start,
    stop,
    toggle,
  };
}
