/**
 * The workspace's interface sounds: the chime the boot animation opens on, and
 * the sustained tone each section of the workspace announces itself with — one
 * per app, and one per page inside an app.
 *
 * Shell-level, like `ui-style.ts` and `cursors.ts` — every app navigates, so no
 * single app owns these (rules #4/#5). Each app's *own* audio stays in its own
 * namespace: `lib/Timer/sound.ts`, `lib/Reminders/sounds.ts`, `lib/Morse/audio.ts`.
 *
 * Synthesized with the Web Audio API rather than shipped as files, exactly as
 * those three are: nothing is downloaded, nothing is added to the bundle, and a
 * cue can't be the thing that delays a navigation (rule #7).
 *
 * Two things decide whether a cue is heard:
 *
 *  - the user's setting, mirrored here from the workspace store — off until it
 *    is switched on in Settings → Sound. It is *also* read straight from storage
 *    on first use, because a cue can be asked for before the store's async
 *    hydration lands and a muted workspace has to stay muted through that
 *    window.
 *  - the browser's autoplay policy. Audio is not allowed until the document has
 *    been interacted with, and creating an AudioContext before then gets it
 *    suspended *and* logs a console warning — so this checks the same signal the
 *    browser gates on and stays out of the way entirely until it flips. That is
 *    what {@link armBootChime} is for: on a cold load there is no interaction to
 *    speak of yet, so the chime waits for one instead of being lost.
 */

/** Persisted preference. Read by the workspace store too, so it stays one key. */
export const UI_SOUND_KEY = "sknotes:ui-sound";

/**
 * Every cue the workspace can play. The navigation names are deliberately the
 * `NavMotion` values from `NavView`, so a motion is its own cue and there is no
 * table to keep in sync.
 */
export type UiCue =
  | "boot"
  | "app"
  | "launcher"
  | "forward"
  | "back"
  | "deeper"
  | "shallower"
  | "rise"
  | "fade";

/**
 * C major pentatonic, G3 up to C7. Every cue is built from steps of this one
 * scale, which is the whole reason two sections in a row never clash: a
 * pentatonic scale has no semitone or tritone in it, so *any* pair of these
 * notes is consonant — whatever order the user moves through the workspace in,
 * and even when one tone is still ringing as the next begins.
 *
 * Its length is not an accident either: it is kept at or above the number of
 * apps in the catalog, so every app can have a note of its own with none left
 * over to share. Add an app and the scale needs a step — at the *top*, where it
 * costs nothing, since every fixed root below is an index into this array.
 */
const SCALE = [
  196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32, 2637.02, 3135.96, 3520.0, 4186.01,
  4698.63, 5274.04,
];

/** A step past the end of the scale is folded back into it. */
function step(i: number): number {
  return SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];
}

interface CueSpec {
  /**
   * `[offset seconds, scale steps above the root]` per note. Written as steps
   * rather than frequencies so a cue's *shape* is independent of its pitch, and
   * the same shape can be transposed to give each section its own tone. Two
   * notes at the same offset sound together as a chord.
   */
  notes: [number, number][];
  /** Scale index the cue sits on when the caller has no position to give. */
  root: number;
  /**
   * `[first step, how many steps]` — the stretch of the scale that positions are
   * mapped into. This is what gives every section of the workspace its own tone:
   * the caller passes a position (a tab's index, an app's place in the catalog)
   * and it lands on its own note of the scale. Positions past the end wrap.
   */
  band?: [number, number];
  /** How long a note rings out, in seconds. */
  ring: number;
  /** Peak of a note's envelope, before the master gain. Deliberately tiny: a
   *  cue that fires on every tab change has to sit under the content. */
  peak: number;
  type?: OscillatorType;
  /**
   * Quiet extra voices, as `[frequency ratio, share of the peak]`. What stops a
   * long tone sounding like a test tone: an octave above shimmers, an octave
   * below gives it a body, and both decay with the fundamental.
   */
  partials?: [number, number][];
}

/**
 * The sound design: sustained, bell-like tones that ring out and fade, rather
 * than blips.
 *
 * Pitch is the information. Each of an app's pages owns a step of the scale and
 * each app owns one too, so a place in the workspace always sounds like itself —
 * and because a tab's tone comes from its position, moving right up a tab bar
 * rises and moving back down falls without either being spelled out.
 *
 * Deliberately plain: three notes to open the workspace and one to open an app,
 * and nothing that is not a note. A start-up sound is heard on every load and an
 * app's tone several times a session, which is the whole argument — anything with
 * a build, a texture or a sequence to it is a performance the second time and an
 * imposition by the tenth. What is left is short, quiet and out of the way.
 *
 * The chime's three notes are spaced across the boot animation's opening beats
 * (see `BootSplash.tsx`) as the app chips converge, and its tail rings on under
 * the wordmark that unfolds after them.
 */
const CUES: Record<UiCue, CueSpec> = {
  // C5 E5 C6 — a major triad with the fifth left out, so it reads as a rise
  // rather than as a chord: up a third, then up to the octave.
  boot: {
    notes: [
      [0, 0],
      [0.12, 2],
      [0.24, 5],
    ],
    root: 7,
    // Short enough that the chime is over well before the veil clears, rather
    // than ringing into the workspace behind it.
    ring: 0.75,
    peak: 0.09,
    partials: [
      [0.5, 0.32],
      [2, 0.1],
    ],
  },
  // An opening app, on its own note: one tone, struck and gone.
  app: {
    notes: [[0, 0]],
    root: 9,
    // The whole scale, so every app in the catalog gets a note to itself. Tied to
    // the scale's length rather than the catalog's: an app past the end would wrap
    // back onto the first app's note, and the fix then is another scale step.
    band: [0, SCALE.length],
    // A soft tone, not a held one: the app is open by the time the veil clears,
    // and a note still ringing after that belongs to the app rather than to the
    // opening of it.
    ring: 0.85,
    peak: 0.07,
    // Only the octave below. A single sustained note *is* the app's identity, and
    // one note needs no headroom above it — an interval would run off the top of
    // the scale for the last apps in the catalog and wrap to a note more than an
    // octave *below* their own, which sounds like a different app entirely.
    partials: [[0.5, 0.3]],
  },
  // An app switch seen from inside a view rather than from the launcher. Kept in
  // step with `app` above: it is the same arrival, reached another way.
  rise: {
    notes: [[0, 0]],
    root: 9,
    band: [0, SCALE.length],
    ring: 0.85,
    peak: 0.07,
    partials: [[0.5, 0.3]],
  },
  /**
   * The app switcher opening. The one cue that is a *chord* — an open fifth,
   * both notes struck together — because it is the only place in the workspace
   * that isn't somewhere you have arrived: everything at once, nothing chosen
   * yet. That texture is what keeps it distinct from the single tones, which
   * matters more than its pitch does, since it has no section of its own.
   *
   * Shorter and quieter than an app's tone: a panel, not a destination.
   */
  launcher: {
    notes: [
      [0, 0],
      [0, 3],
    ],
    root: 5,
    ring: 0.6,
    peak: 0.042,
    partials: [[0.5, 0.22]],
  },
  // A page within an app: one sustained tone, the section's own.
  forward: { notes: [[0, 0]], root: 10, band: [7, 8], ring: 0.85, peak: 0.055, partials: [[2, 0.16]] },
  back: { notes: [[0, 0]], root: 8, band: [7, 8], ring: 0.85, peak: 0.055, partials: [[2, 0.16]] },
  fade: { notes: [[0, 0]], root: 9, band: [7, 8], ring: 0.8, peak: 0.05, partials: [[2, 0.16]] },
  // Drilling into a tool and coming back out. No position to speak of — the
  // interval carries it instead, opening upward and closing downward.
  deeper: {
    notes: [
      [0, 0],
      [0.06, 3],
    ],
    root: 8,
    ring: 0.9,
    peak: 0.05,
    partials: [[2, 0.12]],
  },
  shallower: {
    notes: [
      [0, 3],
      [0.06, 0],
    ],
    root: 8,
    ring: 0.9,
    peak: 0.05,
    partials: [[2, 0.12]],
  },
};

/** Output trim for every cue at once, so the mix can move in one place. */
const MASTER = 0.7;

/** Ceiling for an added partial. See where it is applied in {@link playCue}. */
const MAX_PARTIAL_HZ = 3000;

/**
 * Cues closer together than this are dropped. Two navigations can be announced
 * for one tap — an app that moves its own view as it opens, say — and hearing
 * the cue twice reads as a glitch rather than as two events.
 */
const MIN_GAP_MS = 60;

type NavigatorWithActivation = Navigator & { userActivation?: { hasBeenActive: boolean } };
type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let enabled: boolean | null = null;
let lastAt = 0;
/** Output buses of the cues that may still be ringing. See {@link release}. */
const voices: GainNode[] = [];

/**
 * The preference, read from storage the first time it is needed.
 *
 * Off unless it has been switched on. A workspace that makes noise on its very
 * first load is a surprise, so only a stored "on" counts — an absent key, an
 * older value, or storage being unreadable all mean silence. Sound is something
 * the user opts into, in Settings → Sound.
 */
function isEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = window.localStorage.getItem(UI_SOUND_KEY) === "on";
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

/** Mute or unmute every cue. Called by the workspace store, which persists it. */
export function setUiSoundEnabled(on: boolean): void {
  enabled = on;
}

/**
 * Whether the browser would let a sound play *right now*. Where the User
 * Activation API exists this is the browser's own autoplay gate, so a cue asked
 * for too early is skipped instead of creating a suspended context and the
 * console warning that comes with it (rule #7).
 */
function allowed(): boolean {
  if (typeof window === "undefined") return false;
  const activation = (navigator as NavigatorWithActivation).userActivation;
  return activation ? activation.hasBeenActive : true;
}

function audioCtx(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Schedule one enveloped note: quick attack, long exponential tail. The tail is
 * what makes it read as a struck bell rather than a beep — a linear fade over
 * the same time would sound like a note being turned down.
 */
function note(
  ac: AudioContext,
  out: AudioNode,
  freq: number,
  at: number,
  ring: number,
  peak: number,
  type: OscillatorType,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + ring + 0.02);
}

/**
 * Cut short whatever is still ringing, over 90ms.
 *
 * Tones this long outlive the tap that started them, so without this a run
 * through four tabs would leave four of them sounding at once — consonant,
 * thanks to the scale, but a chord nobody asked for. Ducking the previous tone
 * instead of stopping it dead keeps the hand-off inaudible.
 */
function release(at: number) {
  for (const gain of voices) {
    try {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    } catch {
      /* node already finished — nothing to duck */
    }
  }
  voices.length = 0;
}

/**
 * Play one cue.
 *
 * `position` is what gives a section its own tone: a tab's index within its bar,
 * or an app's place in the catalog. It is a position and not a frequency on
 * purpose — the caller knows *which* section, and the sound design here decides
 * what that sounds like. Cues with no band (the chime, the launcher, drilling in
 * and out) ignore it.
 *
 * Returns whether it was actually scheduled — silently false when the user has
 * muted them, the browser won't allow audio yet, or another cue just fired.
 * Never throws: a missing Web Audio implementation is not a reason for a
 * navigation to fail.
 */
export function playCue(cue: UiCue, position?: number): boolean {
  if (typeof window === "undefined" || !isEnabled() || !allowed()) return false;

  const now = performance.now();
  if (now - lastAt < MIN_GAP_MS) return false;

  try {
    const ac = audioCtx();
    if (!ac) return false;

    const spec = CUES[cue];
    // A hair in the future: scheduling at exactly `currentTime` can clip the
    // attack, since the first block may already be being rendered.
    const start = ac.currentTime + 0.015;

    release(start);

    const bus = ac.createGain();
    bus.gain.value = MASTER;
    bus.connect(ac.destination);
    voices.push(bus);

    const root =
      spec.band && position !== undefined && position >= 0
        ? spec.band[0] + (position % spec.band[1])
        : spec.root;

    for (const [offset, steps] of spec.notes) {
      const at = start + offset;
      const freq = step(root + steps);
      note(ac, bus, freq, at, spec.ring, spec.peak, spec.type ?? "sine");
      for (const [ratio, share] of spec.partials ?? []) {
        // Nothing shrill: a partial above this is dropped rather than played, so
        // the tones near the top of the scale stay as round as the low ones.
        if (freq * ratio > MAX_PARTIAL_HZ) continue;
        // The octave below rings longer than the fundamental, the one above
        // shorter — which is roughly what a struck bell does.
        note(
          ac,
          bus,
          freq * ratio,
          at,
          spec.ring * (ratio < 1 ? 1.25 : 0.7),
          spec.peak * share,
          "sine",
        );
      }
    }

    lastAt = now;
    return true;
  } catch {
    return false;
  }
}

/** The events that count as the interaction the autoplay policy waits for. */
const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Play the boot chime, or hold it until the browser allows sound.
 *
 * On a cold load there has been no interaction yet, so the chime is almost
 * always blocked — arming it means the first tap or key press *while the boot
 * animation is still on screen* plays it, and anything later doesn't: the
 * returned disposer drops it. That is the honest behaviour for a start-up
 * sound. A chime that fired minutes into a session, on whatever the user
 * happened to click, would be a bug rather than a flourish — so
 * <BootSplash /> calls the disposer when it tears the layer down.
 */
export function armBootChime(): () => void {
  if (typeof window === "undefined" || !isEnabled()) return () => {};
  if (playCue("boot")) return () => {};

  const off = () => {
    for (const type of GESTURES) window.removeEventListener(type, fire, true);
  };
  const fire = () => {
    off();
    playCue("boot");
  };
  for (const type of GESTURES) {
    window.addEventListener(type, fire, { capture: true, once: true, passive: true });
  }
  return off;
}
