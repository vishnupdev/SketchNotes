/**
 * The imagery this map is drawn from: which tile services it asks, at which
 * addresses, and what each one must be credited as.
 *
 * Every source here is open and keyless on purpose. A satellite map that needs
 * an API token would be a map that stops working the day someone else's free
 * tier changes, in a workspace whose whole premise is that a tool you open is a
 * tool that runs (rule #5's spirit, applied outward). The cost of that choice is
 * that attribution is not optional — these are other people's tiles, so the
 * credit line under the map is part of the feature, not decoration.
 */

export type BaseLayerId = "satellite" | "streets" | "terrain";

export interface TileSource {
  /** Address of one tile. `z` is zoom, `x`/`y` the tile's column and row. */
  url: (x: number, y: number, z: number) => string;
  /** Deepest zoom the service actually has tiles for. */
  maxZoom: number;
  /** Credit line, shown under the map whenever this source is drawn. */
  credit: string;
}

export interface BaseLayer extends TileSource {
  id: BaseLayerId;
  name: string;
  /** One line for the layer picker — what this view is *for*. */
  blurb: string;
}

/**
 * Esri's tiled services number their tiles `/{z}/{row}/{col}` — row before
 * column, the reverse of the `{z}/{x}/{y}` almost everything else uses. Written
 * once here so the swap can't be got wrong twice.
 */
const esri = (service: string, maxZoom: number, credit: string): TileSource => ({
  url: (x, y, z) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/${z}/${y}/${x}`,
  maxZoom,
  credit,
});

export const BASE_LAYERS: readonly BaseLayer[] = [
  {
    id: "satellite",
    name: "Satellite",
    blurb: "Photographic imagery of the ground itself.",
    ...esri("World_Imagery", 19, "Imagery © Esri, Maxar, Earthstar Geographics"),
  },
  {
    id: "streets",
    name: "Streets",
    blurb: "The drawn map — roads, buildings and names.",
    // Esri's street tiles rather than openstreetmap.org's own: OSM's tile
    // servers are donation-funded and their usage policy asks applications to
    // stay off them. Their *data* is still what this is drawn from, and is
    // credited as such — it is the hosting that has been moved.
    ...esri("World_Street_Map", 19, "Streets © Esri, OpenStreetMap contributors"),
  },
  {
    id: "terrain",
    name: "Terrain",
    blurb: "Relief and elevation, with the land shaded.",
    ...esri("World_Topo_Map", 19, "Topography © Esri, USGS, NOAA"),
  },
];

export const BASE_LAYER_IDS = BASE_LAYERS.map((l) => l.id);

export const baseLayer = (id: BaseLayerId): BaseLayer =>
  BASE_LAYERS.find((l) => l.id === id) ?? BASE_LAYERS[0];

/**
 * Place names and boundaries as a transparent sheet over whatever is beneath.
 * Kept separate from the base layers rather than shipped as a "hybrid" fourth
 * one, because it is equally useful over terrain — and because a single toggle
 * is a smaller thing to explain than a layer that is two layers.
 */
export const LABELS_SOURCE: TileSource = esri(
  "Reference/World_Boundaries_and_Places",
  19,
  "Labels © Esri",
);

export const isSatelliteBase = (id: BaseLayerId): boolean => id === "satellite";
