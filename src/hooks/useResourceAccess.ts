"use client";

import { useCallback, useEffect, useState } from "react";
import { ACCESS_ITEMS, type AccessId, type AccessState } from "@/lib/Resources/catalog";
import { readAllAccess, watchAccess, type AccessStates } from "@/lib/Resources/permissions";

/** Everything unknown until the first read lands — never an empty object. */
const initial = (): AccessStates =>
  Object.fromEntries(ACCESS_ITEMS.map((i) => [i.id, "unknown" as AccessState])) as AccessStates;

/**
 * Live permission state for every resource in the catalog.
 *
 * Three things keep it honest. It re-reads on mount; it subscribes to each
 * `PermissionStatus` so a change made in the browser's own site settings lands
 * here without a refresh; and it re-reads whenever the tab regains focus, which
 * is what catches the permissions that changed *while* the user was away in
 * that settings screen — the one case the change event does not cover, because
 * some browsers replace the status object instead of updating it.
 */
export function useResourceAccess() {
  const [states, setStates] = useState<AccessStates>(initial);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await readAllAccess();
    setStates(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    void readAllAccess().then((next) => {
      if (!alive) return;
      setStates(next);
      setLoading(false);
    });

    const unwatch = watchAccess((id: AccessId, state: AccessState) => {
      if (alive) setStates((prev) => ({ ...prev, [id]: state }));
    });

    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      alive = false;
      unwatch();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  return { states, loading, refresh };
}
