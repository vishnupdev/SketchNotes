import { beforeEach, describe, expect, it } from "vitest";
import { useSatelliteStore, type LiveFix } from "./useSatelliteStore";
import { MAX_LAT } from "@/lib/Satellite/mercator";
import { baseLayer } from "@/lib/Satellite/layers";

/**
 * The map's follow state machine.
 *
 * An exception to this suite's usual "no framework code" line (see
 * `vitest.config.mts`), and it earns it: every rule below is a *silent* one.
 * A map that quietly stops following you, or one that snatches the view back
 * while you are dragging it, looks exactly like a map that is working — there is
 * no error, no empty state, nothing to notice until you are relying on it.
 *
 * It also cannot be covered in the browser, which is where this project verifies
 * its UI. Chrome's geolocation emulation refuses to deliver a *second* fix to a
 * live `watchPosition`: moving the emulated device raises POSITION_UNAVAILABLE
 * instead, so "the map followed me" is precisely the assertion a real browser
 * cannot make. Twice while this app was being written a test appeared to prove
 * following was broken, and both times the test had broken it itself.
 *
 * The store is plain Zustand with no React in the path, so it is driven here
 * directly.
 */

const HOME = { lat: 9.9312, lon: 76.2673 };
const MOVED = { lat: 10.05, lon: 76.35 };

const fixAt = (p: { lat: number; lon: number }): LiveFix => ({
  ...p,
  accuracy: 20,
  speed: null,
  heading: null,
  altitude: null,
  ts: Date.now(),
});

/** A store back at its opening state, whatever the previous test left behind. */
beforeEach(() => {
  useSatelliteStore.setState({
    center: { lat: 20, lon: 0 },
    zoom: 3,
    base: "satellite",
    fix: null,
    tracking: false,
    fixError: null,
    follow: false,
    centreOnNextFix: false,
    pin: null,
    saved: [],
  });
});

const s = () => useSatelliteStore.getState();

describe("following your position", () => {
  it("brings the map with you once following is on", () => {
    s().setFix(fixAt(HOME));
    s().setFollow(true);
    expect(s().center.lat).toBeCloseTo(HOME.lat, 6);

    s().setFix(fixAt(MOVED));
    expect(s().center.lat).toBeCloseTo(MOVED.lat, 6);
    expect(s().center.lon).toBeCloseTo(MOVED.lon, 6);
  });

  it("leaves the map alone when following is off", () => {
    s().setFix(fixAt(HOME));
    expect(s().center).toEqual({ lat: 20, lon: 0 });
    s().setFix(fixAt(MOVED));
    expect(s().center).toEqual({ lat: 20, lon: 0 });
  });

  it("centres the moment you switch following on", () => {
    // Otherwise nothing happens until the next fix, which outdoors and
    // stationary can be many seconds of a button that looks broken.
    s().setFix(fixAt(HOME));
    s().setFollow(true);
    expect(s().center.lat).toBeCloseTo(HOME.lat, 6);
  });

  it("does nothing on switching following on before there is a fix", () => {
    s().setFollow(true);
    expect(s().center).toEqual({ lat: 20, lon: 0 });
    expect(s().follow).toBe(true);
  });

  it("hands the wheel back the moment you move the map yourself", () => {
    s().setFix(fixAt(HOME));
    s().setFollow(true);
    s().setView({ lat: 51.5, lon: -0.12 });
    expect(s().follow).toBe(false);
    // And it stays where you put it, however many fixes arrive after.
    s().setFix(fixAt(MOVED));
    expect(s().center.lat).toBeCloseTo(51.5, 6);
  });

  it("keeps following through a zoom, which is not a change of mind", () => {
    s().setFix(fixAt(HOME));
    s().setFollow(true);
    s().zoomBy(4);
    expect(s().follow).toBe(true);
    expect(s().zoom).toBe(7);
  });

  it("stops following when the watch is stopped", () => {
    // Following a position nothing is updating any more would freeze the map
    // onto a stale dot with no sign that it had stopped meaning anything.
    s().setFix(fixAt(HOME));
    s().setTracking(true);
    s().setFollow(true);
    s().setTracking(false);
    expect(s().follow).toBe(false);
  });

  it("takes you there on the fix you asked for, once", () => {
    s().requestCentreOnFix();
    s().setFix(fixAt(HOME));
    expect(s().center.lat).toBeCloseTo(HOME.lat, 6);
    // Close enough to recognise the street, from a world view.
    expect(s().zoom).toBeGreaterThanOrEqual(15);

    // Spent: the next fix must not move a map you have since panned away.
    s().setView({ lat: 51.5, lon: -0.12 });
    s().setFix(fixAt(MOVED));
    expect(s().center.lat).toBeCloseTo(51.5, 6);
  });

  it("does not pull you back out when you are already zoomed in", () => {
    s().setView({ lat: 0, lon: 0 }, 18);
    s().requestCentreOnFix();
    s().setFix(fixAt(HOME));
    expect(s().zoom).toBe(18);
  });

  it("drops a pending jump when you give up on locating", () => {
    // Otherwise a fix landing minutes later yanks the map off whatever you had
    // gone on to look at instead.
    s().requestCentreOnFix();
    s().setTracking(true);
    s().setTracking(false);
    s().setFix(fixAt(HOME));
    expect(s().center).toEqual({ lat: 20, lon: 0 });
  });

  it("clears a previous failure as soon as a fix lands", () => {
    s().setFixError("Locating timed out. Try again with a clearer view of the sky.");
    s().setFix(fixAt(HOME));
    expect(s().fixError).toBeNull();
  });
});

describe("the view", () => {
  it("never lets the map be sent somewhere Mercator cannot draw", () => {
    s().setView({ lat: 91, lon: 400 });
    expect(s().center.lat).toBe(MAX_LAT);
    expect(s().center.lon).toBeCloseTo(40, 6);
  });

  it("clamps zoom to what the chosen layer actually has", () => {
    const max = baseLayer("satellite").maxZoom;
    s().zoomBy(50);
    expect(s().zoom).toBe(max);
    s().zoomBy(-100);
    expect(s().zoom).toBe(2);
  });

  it("brings the view up with a layer that has shallower imagery", () => {
    s().setView({ lat: 0, lon: 0 }, 19);
    s().setBase("terrain");
    expect(s().zoom).toBeLessThanOrEqual(baseLayer("terrain").maxZoom);
  });
});

describe("kept places", () => {
  const place = (id: string) => ({ id, name: id, detail: id, lat: 1, lon: 2, zoom: 14 });

  it("keeps the newest first and never twice", () => {
    s().savePlace(place("a"));
    s().savePlace(place("b"));
    s().savePlace(place("a"));
    expect(s().saved.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("forgets one without disturbing the rest", () => {
    s().savePlace(place("a"));
    s().savePlace(place("b"));
    s().removePlace("a");
    expect(s().saved.map((p) => p.id)).toEqual(["b"]);
  });
});
