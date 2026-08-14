import { ACCESS_ITEMS, type AccessId, type AccessItem, type AccessState } from "./catalog";

/**
 * Reading — and, on request, exercising — the browser's permission state for
 * every resource in the catalog.
 *
 * Two rules run through the whole file. Nothing here ever throws: an unknown
 * descriptor, a disabled API or a hostile browser all resolve to a state the UI
 * can render. And nothing is left holding a resource: every request releases
 * what it opened before it returns, so asking a question in the Access tab can
 * never leave the camera light on.
 */

/* ------------------------------- reading -------------------------------- */

const toState = (s: PermissionState): AccessState =>
  s === "granted" ? "granted" : s === "denied" ? "denied" : "prompt";

/**
 * `permissions.query()` for a descriptor the browser may not know. A rejected
 * promise means "this browser has no such permission", which is a legitimate
 * answer and not an error — hence the null rather than a throw.
 */
async function queryStatus(name: string): Promise<PermissionStatus | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
  try {
    return await navigator.permissions.query({ name } as unknown as PermissionDescriptor);
  } catch {
    return null;
  }
}

/**
 * Fallbacks for resources the Permissions API can't answer for. Notifications
 * carry their own state on the constructor, and screen capture deliberately has
 * no stored state at all — the browser asks every single time.
 */
function fallbackState(item: AccessItem): AccessState {
  if (item.id === "notifications" && typeof Notification !== "undefined") {
    const p = Notification.permission;
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt";
  }
  // A chooser-gated API (screen capture, USB, HID, serial, Bluetooth on most
  // builds) has nothing stored to report: it is available, and it will ask.
  return item.probe() ? "prompt" : "unsupported";
}

/** Current state of one resource. */
export async function readAccess(item: AccessItem): Promise<AccessState> {
  if (!item.probe()) return "unsupported";
  if (item.permission) {
    const status = await queryStatus(item.permission);
    if (status) return toState(status.state);
  }
  return fallbackState(item);
}

export type AccessStates = Record<AccessId, AccessState>;

/** Every resource's state, read in parallel. */
export async function readAllAccess(): Promise<AccessStates> {
  const pairs = await Promise.all(
    ACCESS_ITEMS.map(async (item) => [item.id, await readAccess(item)] as const),
  );
  return Object.fromEntries(pairs) as AccessStates;
}

/**
 * Subscribe to permission changes so a grant or a revoke made in the browser's
 * own UI shows up here without a refresh. Returns a cleanup function.
 */
export function watchAccess(onChange: (id: AccessId, state: AccessState) => void): () => void {
  const detach: Array<() => void> = [];
  let cancelled = false;

  for (const item of ACCESS_ITEMS) {
    if (!item.permission || !item.probe()) continue;
    void queryStatus(item.permission).then((status) => {
      if (!status || cancelled) return;
      const handler = () => onChange(item.id, toState(status.state));
      status.addEventListener("change", handler);
      detach.push(() => status.removeEventListener("change", handler));
    });
  }

  return () => {
    cancelled = true;
    for (const off of detach) off();
  };
}

/* ------------------------------ requesting ------------------------------ */

/** Minimal shapes for the APIs `lib.dom` doesn't type yet. */
interface IdleDetectorCtor {
  requestPermission: () => Promise<PermissionState>;
}
interface ScreenDetailsLike {
  screens: unknown[];
}
interface LocalFontLike {
  family: string;
}
type FontWindow = Window & { queryLocalFonts?: () => Promise<LocalFontLike[]> };
type ScreensWindow = Window & { getScreenDetails?: () => Promise<ScreenDetailsLike> };
type IdleWindow = Window & { IdleDetector?: IdleDetectorCtor };
type MidiNavigator = Navigator & {
  requestMIDIAccess?: () => Promise<{ inputs: { size: number }; outputs: { size: number } }>;
};

export interface AccessResult {
  ok: boolean;
  /** One sentence for the row to show under the resource. */
  message: string;
}

const failure = (e: unknown, fallback: string): AccessResult => ({
  ok: false,
  message: e instanceof Error && e.message ? `${fallback} (${e.name})` : fallback,
});

/**
 * Ask for one resource for real, then hand it straight back.
 *
 * Camera, microphone, screen and location are not handled here — those are the
 * four the Live tab holds open and shows you, so asking for them from a row
 * would open something the user can't see or stop.
 */
export async function requestAccess(id: AccessId): Promise<AccessResult> {
  try {
    switch (id) {
      case "notifications": {
        if (typeof Notification === "undefined") {
          return { ok: false, message: "This browser has no notifications." };
        }
        const p = await Notification.requestPermission();
        return p === "granted"
          ? { ok: true, message: "Allowed. Reminders and the timer can alert you." }
          : { ok: false, message: `Not allowed (${p}).` };
      }

      case "clipboard-read": {
        const text = await navigator.clipboard.readText();
        return {
          ok: true,
          message: `Allowed — the page just read ${text.length} character${
            text.length === 1 ? "" : "s"
          } from your clipboard. Nothing was kept.`,
        };
      }

      case "wake-lock": {
        const lock = await navigator.wakeLock.request("screen");
        await lock.release();
        return { ok: true, message: "Allowed — the lock was taken and released again." };
      }

      case "storage": {
        const persisted = await navigator.storage.persist();
        return persisted
          ? { ok: true, message: "Granted — saved data will not be evicted automatically." }
          : { ok: false, message: "Not granted. Data stays best-effort and may be evicted." };
      }

      case "speakers": {
        // Labels only appear once the site holds a media permission, so an
        // unlabelled list is itself the answer: nothing has been granted.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outs = devices.filter((d) => d.kind === "audiooutput");
        const named = outs.filter((d) => d.label).length;
        return {
          ok: named > 0,
          message: `${outs.length} audio output${outs.length === 1 ? "" : "s"} visible, ${named} named. Names appear only after you allow the microphone.`,
        };
      }

      case "idle": {
        const ctor = (window as IdleWindow).IdleDetector;
        if (!ctor) return { ok: false, message: "This browser has no idle detection." };
        const p = await ctor.requestPermission();
        return { ok: p === "granted", message: `Idle detection: ${p}.` };
      }

      case "windows": {
        const get = (window as ScreensWindow).getScreenDetails;
        if (!get) return { ok: false, message: "This browser has no window placement API." };
        const details = await get.call(window);
        return {
          ok: true,
          message: `Allowed — ${details.screens.length} display${details.screens.length === 1 ? "" : "s"} are visible to this page.`,
        };
      }

      case "fonts": {
        const query = (window as FontWindow).queryLocalFonts;
        if (!query) return { ok: false, message: "This browser has no local-font API." };
        const fonts = await query.call(window);
        return {
          ok: true,
          message: `Allowed — ${fonts.length} installed fonts were listed. That set alone can identify this machine.`,
        };
      }

      case "midi": {
        const nav = navigator as MidiNavigator;
        if (!nav.requestMIDIAccess) return { ok: false, message: "This browser has no MIDI." };
        const access = await nav.requestMIDIAccess();
        return {
          ok: true,
          message: `Allowed — ${access.inputs.size} MIDI in, ${access.outputs.size} out.`,
        };
      }

      default:
        return { ok: false, message: "Nothing to ask for here." };
    }
  } catch (e) {
    return failure(e, "The browser refused or dismissed the request.");
  }
}
