/**
 * Alerting for finished timers: a synthesized chime via the Web Audio API (no
 * asset files) plus an optional desktop notification. The audio context is
 * created lazily and unlocked on a user gesture — call {@link primeAudio} from
 * the Start handler so the chime can play later even if the tab is backgrounded.
 */

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Resume/unlock the audio context on a user gesture. Safe to call repeatedly. */
export function primeAudio(): void {
  const ac = audioCtx();
  if (ac && ac.state === "suspended") void ac.resume();
}

/** Play a short three-note chime. `urgent` uses more, higher beeps. */
export function playChime(urgent = false): void {
  const ac = audioCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const start = ac.currentTime;
  const notes = urgent ? [880, 1046, 1318, 1046] : [660, 880, 990];
  notes.forEach((freq, i) => {
    const t = start + i * 0.18;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  });
}

/** Ask for notification permission (no-op if unsupported or already decided). */
export function requestNotify(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission().catch(() => {});
  }
}

/** Fire a desktop notification if permission was granted. */
export function notify(title: string, body?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, silent: false });
  } catch {
    /* some browsers require a service worker; ignore */
  }
}
