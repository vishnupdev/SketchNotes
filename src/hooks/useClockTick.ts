"use client";

import { useEffect, useState } from "react";

/**
 * A `Date` that keeps itself current, for anything that displays a live clock.
 *
 * Three things a naive `setInterval(…, 1000)` gets wrong, and this doesn't:
 *
 *  - **Drift.** Each tick is scheduled to land on the next real second (or
 *    minute) boundary rather than 1000 ms after the last one, so the display
 *    flips when the clock actually changes instead of sliding out of step.
 *  - **Wasted work.** When seconds aren't on screen it ticks once a minute,
 *    which is a 60× cut in re-renders across a board of clocks.
 *  - **Background drift.** Browsers throttle timers in hidden tabs, so the
 *    time is re-read the moment the tab becomes visible again — you never come
 *    back to a clock showing a stale minute.
 */
export function useClockTick(everySecond = true): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const period = everySecond ? 1_000 : 60_000;
    let timer = 0;
    let stopped = false;

    const schedule = () => {
      // Delay to the next boundary, so ticks stay aligned to the wall clock.
      const delay = period - (Date.now() % period);
      timer = window.setTimeout(() => {
        if (stopped) return;
        setNow(new Date());
        schedule();
      }, delay);
    };

    const resync = () => {
      if (document.hidden) return;
      setNow(new Date());
    };

    schedule();
    document.addEventListener("visibilitychange", resync);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [everySecond]);

  return now;
}
