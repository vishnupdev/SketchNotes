"use client";

import { useCallback, useEffect } from "react";
import { useSatelliteStore } from "@/store/useSatelliteStore";

/**
 * The device's own position, watched while the user asks for it.
 *
 * A watch — not a one-off read — because the app's claim is a *live* view: with
 * tracking on, every new fix moves the marker, and if `follow` is on the map
 * comes with it. High accuracy is requested, which on a phone means GPS rather
 * than the network's guess, and that is the difference between a dot on your
 * street and a dot on your city.
 *
 * Everything here is torn down on unmount, and the workspace unmounts an app
 * when you leave it (`AppFrame` in `Workspace.tsx`), so switching apps is what
 * stops the location watch. Nothing keeps following you into another tool.
 */
export function useLivePosition() {
  const tracking = useSatelliteStore((s) => s.tracking);
  const setTracking = useSatelliteStore((s) => s.setTracking);
  const setFix = useSatelliteStore((s) => s.setFix);
  const setFixError = useSatelliteStore((s) => s.setFixError);

  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!tracking) return;
    if (!supported) {
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
  }, [tracking, supported, setFix, setFixError, setTracking]);

  const start = useCallback(() => {
    setFixError(null);
    setTracking(true);
  }, [setFixError, setTracking]);

  const stop = useCallback(() => setTracking(false), [setTracking]);

  return { supported, tracking, start, stop };
}
