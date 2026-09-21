import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { clampValue, MAX_SEND_TEXT, SEND_TARGETS, targetsFor, type SendKind } from "./types";

const at = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const read = (path: string) => readFileSync(at(path), "utf8");

const KINDS = Object.keys(SEND_TARGETS) as SendKind[];

/**
 * The Send to… registry.
 *
 * Two failures here are silent, which is why they are tested rather than left
 * to review. A kind with no destinations renders a "Send to…" button that opens
 * an empty menu. A destination with no consumer is worse: the user taps it, the
 * workspace switches to that app, and *nothing happens* — no error, no payload,
 * just an app they did not ask for. Both typecheck, both lint, and neither is
 * visible until someone tries it.
 */
describe("SEND_TARGETS", () => {
  it("offers at least one destination for every kind", () => {
    expect(KINDS.length).toBeGreaterThan(0);
    for (const kind of KINDS) {
      expect(targetsFor(kind).length, `${kind} has no destination`).toBeGreaterThan(0);
    }
  });

  it("never lists the same destination twice for one kind", () => {
    for (const kind of KINDS) {
      const apps = targetsFor(kind).map((t) => t.app);
      expect(new Set(apps).size, `${kind} repeats a destination`).toBe(apps.length);
    }
  });

  it("says what each destination will do, as an action", () => {
    for (const kind of KINDS) {
      for (const target of targetsFor(kind)) {
        // The menu row's second line is the whole basis for choosing between
        // two destinations; a blank or one-word one makes the menu a guess.
        expect(target.does.length, `${kind} → ${target.app}`).toBeGreaterThan(8);
      }
    }
  });
});

/**
 * Every registered destination has actually been wired to receive.
 *
 * Read as text, the same way `scripts/check-app-registry.mjs` reads the
 * registry it checks: the app modules are TSX components that this node-only
 * suite cannot import, and what needs checking is a wiring fact, not behaviour.
 */
describe("every destination consumes what it is offered", () => {
  const loaders = read("src/lib/offline/app-modules.ts");

  /** The component path `APP_LOADERS` maps an app id to. */
  const moduleFor = (app: string): string => {
    const entry = new RegExp(`\\b${app}:\\s*\\(\\)\\s*=>\\s*import\\("@/(components/[^"]+)"`);
    const match = entry.exec(loaders);
    if (!match) throw new Error(`No APP_LOADERS entry found for "${app}" — has the map changed?`);
    return `src/${match[1]}.tsx`;
  };

  for (const kind of KINDS) {
    for (const target of targetsFor(kind)) {
      it(`${target.app} takes the ${kind} sent to it`, () => {
        const source = read(moduleFor(target.app));
        expect(source, `${target.app} is a Send to… destination but never reads useSendToStore`)
          .toContain("useSendToStore");
        // Watching for arrivals goes through the `hasSendTo` selector — a
        // destination that imports the store but never subscribes would only
        // notice a payload if it happened to re-render for some other reason.
        expect(source, `${target.app} imports the send-to store but never watches for arrivals`)
          .toContain("hasSendTo");
      });
    }
  }
});

describe("clampValue", () => {
  it("trims surrounding whitespace off both kinds", () => {
    expect(clampValue("text", "  hello  ")).toBe("hello");
    expect(clampValue("color", "  #3a86ff\n")).toBe("#3a86ff");
  });

  it("caps text at the payload limit and leaves colours alone", () => {
    expect(clampValue("text", "a".repeat(MAX_SEND_TEXT + 500))).toHaveLength(MAX_SEND_TEXT);
    expect(clampValue("color", "#ffffff")).toBe("#ffffff");
  });
});
