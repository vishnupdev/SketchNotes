/**
 * Deciding what kind of product an article describes, and how to lay its specs
 * out once it has been decided.
 *
 * The category is the hinge of the whole app: it chooses which spec rows are
 * worth grouping together, which measures are worth extracting, and which
 * scoring bands apply. Getting it from the article's *infobox template* is what
 * keeps it honest — a phone article declares `{{Infobox mobile phone}}` and a
 * car declares `{{Infobox automobile}}`, so the classification is the source's
 * own, not this app's opinion about a name.
 *
 * Where the template is genuinely ambiguous — `Infobox information appliance`
 * covers laptops, consoles and set-top boxes alike — the infobox's own `type`
 * row settles it, and only then does a keyword decide.
 */

import type { ParsedInfobox } from "./wikitext";
import type { ProductCategory, SpecField, SpecGroup } from "./types";

/** How a category names itself on the sheet. */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  phone: "Phone",
  computer: "Computer",
  console: "Games console",
  camera: "Camera",
  audio: "Audio",
  wearable: "Wearable",
  component: "Component",
  appliance: "Appliance",
  car: "Car",
  motorcycle: "Motorcycle",
  aircraft: "Aircraft",
  other: "Product",
};

/**
 * Template name → category, checked as substrings in this order. Order is the
 * specification: "electric vehicle" has to be tried before "vehicle", and
 * "mobile phone" before "phone", or the broader rule wins first.
 */
const TEMPLATE_RULES: [needle: string, category: ProductCategory][] = [
  ["mobile phone", "phone"],
  ["smartphone", "phone"],
  ["electric vehicle", "car"],
  ["automobile", "car"],
  ["car model", "car"],
  ["truck", "car"],
  ["bus", "car"],
  ["motorcycle", "motorcycle"],
  ["aircraft", "aircraft"],
  ["rocket", "aircraft"],
  ["spacecraft", "aircraft"],
  ["camera", "camera"],
  ["lens", "camera"],
  ["cpu", "component"],
  ["gpu", "component"],
  ["computer hardware", "component"],
  ["chipset", "component"],
  ["microprocessor", "component"],
  ["laptop", "computer"],
  ["computer", "computer"],
  ["information appliance", "computer"],
  ["computing device", "computer"],
  ["operating system", "other"],
  ["video game console", "console"],
  ["game console", "console"],
  ["home appliance", "appliance"],
  ["appliance", "appliance"],
  ["headphone", "audio"],
  ["loudspeaker", "audio"],
  ["synthesizer", "audio"],
  ["watch", "wearable"],
  ["drone", "aircraft"],
];

/**
 * Words in the infobox's own `type` / `class` row that override the template.
 * Tried before the template rules for the ambiguous templates, because a
 * console and a laptop share one template and differ only here.
 */
const TYPE_RULES: [needle: string, category: ProductCategory][] = [
  ["video game console", "console"],
  ["game console", "console"],
  ["handheld game", "console"],
  ["smartphone", "phone"],
  ["mobile phone", "phone"],
  ["feature phone", "phone"],
  ["tablet", "computer"],
  ["laptop", "computer"],
  ["notebook", "computer"],
  ["desktop", "computer"],
  ["smartwatch", "wearable"],
  ["fitness tracker", "wearable"],
  ["headphone", "audio"],
  ["earbud", "audio"],
  ["speaker", "audio"],
  ["soundbar", "audio"],
  ["camera", "camera"],
  ["vacuum", "appliance"],
  ["refrigerator", "appliance"],
  ["washing machine", "appliance"],
  ["microwave", "appliance"],
  ["graphics card", "component"],
  ["processor", "component"],
  ["motorcycle", "motorcycle"],
  ["scooter", "motorcycle"],
];

/** Templates whose `type` row is worth consulting before the template name. */
const AMBIGUOUS = /information appliance|computing device|electronic device|product|consumer/;

/** What kind of product this article describes. */
export function detectCategory(box: ParsedInfobox): ProductCategory {
  const template = box.template;
  const typeRow = box.fields
    .filter((f) => f.key === "type" || f.key === "class" || f.key === "category")
    .map((f) => f.value)
    .join(" ")
    .toLowerCase();

  const byType = TYPE_RULES.find(([needle]) => typeRow.includes(needle))?.[1];
  if (byType && AMBIGUOUS.test(template)) return byType;

  const byTemplate = TEMPLATE_RULES.find(([needle]) => template.includes(needle))?.[1];
  if (byTemplate) return byTemplate;

  return byType ?? "other";
}

/**
 * Labels for infobox keys whose machine name doesn't read well, or whose
 * expansion isn't obvious ("soc", "hp", "bhp"). Anything absent is humanised
 * mechanically by {@link labelFor}, which handles the large majority.
 */
const KEY_LABELS: Record<string, string> = {
  soc: "Chip",
  system_on_chip: "Chip",
  cpu: "Processor",
  gpu: "Graphics",
  os: "Operating system",
  ram: "Memory",
  memory_card: "Memory card",
  sim: "SIM",
  form_factor: "Form factor",
  rear_camera: "Rear camera",
  front_camera: "Front camera",
  water_resistance: "Water resistance",
  made_in: "Made in",
  units_sold: "Units sold",
  top_game: "Best-selling game",
  body_style: "Body style",
  model_years: "Model years",
  electric_range: "Electric range",
  fuel_capacity: "Fuel capacity",
  bore_stroke: "Bore × stroke",
  compression_ratio: "Compression ratio",
  power: "Power",
  torque: "Torque",
  top_speed: "Top speed",
  wheelbase: "Wheelbase",
  suspension: "Suspension",
  brakes: "Brakes",
  tires: "Tyres",
  seat_height: "Seat height",
  dry_weight: "Dry weight",
  wet_weight: "Kerb weight",
  aka: "Also known as",
  hac: "Hearing-aid compatibility",
  lens_mount: "Lens mount",
  sensor_type: "Sensor",
  sensor_size: "Sensor size",
  recording_medium: "Recording medium",
  shutter_speeds: "Shutter speed",
  iso_range: "ISO range",
  viewfinder: "Viewfinder",
  online_services: "Online services",
  release_date: "Released",
  released: "Released",
  discontinued: "Discontinued",
  developer: "Developer",
  manufacturer: "Manufacturer",
  designer: "Designer",
  assembly: "Assembly",
  predecessor: "Replaced",
  successor: "Replaced by",
  related: "Related",
  website: "Website",
  price: "Launch price",
  connectivity: "Connectivity",
  networks: "Networks",
  input: "Inputs & sensors",
  display: "Display",
  storage: "Storage",
  battery: "Battery",
  charging: "Charging",
  dimensions: "Dimensions",
  weight: "Weight",
  colors: "Colours",
  colours: "Colours",
};

/** A human label for an infobox key. */
export function labelFor(key: string): string {
  const known = KEY_LABELS[key];
  if (known) return known;
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface GroupDef {
  id: string;
  title: string;
  keys: string[];
}

/**
 * Where each spec row belongs, per category.
 *
 * A row's group is decided by which list names its key; anything unnamed falls
 * into "More specifications" at the end rather than being dropped. That is the
 * important half of this design — these templates carry hundreds of optional
 * fields and no hand-written list will ever cover them all, so the default has
 * to be *keep it*, not *hide it*.
 */
const GROUPS: Partial<Record<ProductCategory, GroupDef[]>> = {
  phone: [
    { id: "core", title: "Chip & memory", keys: ["soc", "system_on_chip", "cpu", "gpu", "memory", "ram", "storage", "memory_card"] },
    { id: "display", title: "Display", keys: ["display", "screen", "resolution"] },
    { id: "camera", title: "Cameras", keys: ["rear_camera", "front_camera", "camera", "video"] },
    { id: "power", title: "Power", keys: ["battery", "charging"] },
    { id: "body", title: "Body", keys: ["dimensions", "weight", "form_factor", "colors", "colours", "water_resistance", "made_in"] },
    { id: "software", title: "Software & network", keys: ["os", "networks", "connectivity", "sim", "sound", "input"] },
  ],
  computer: [
    { id: "core", title: "Chip & memory", keys: ["soc", "system_on_chip", "cpu", "gpu", "graphics", "memory", "memory_type", "ram", "storage", "memory_card"] },
    { id: "display", title: "Display", keys: ["display", "screen", "resolution", "touchpad", "camera"] },
    { id: "power", title: "Power", keys: ["power", "battery", "charging"] },
    { id: "body", title: "Body", keys: ["dimensions", "weight", "form_factor", "colors", "colours", "material"] },
    { id: "software", title: "Software & ports", keys: ["os", "connectivity", "ports", "input", "sound", "media", "online_services", "compatibility"] },
  ],
  console: [
    { id: "core", title: "Chip & memory", keys: ["soc", "system_on_chip", "cpu", "gpu", "memory", "storage", "memory_card", "media"] },
    { id: "display", title: "Display & sound", keys: ["display", "resolution", "sound"] },
    { id: "play", title: "Playing it", keys: ["input", "controllers", "compatibility", "online_services", "top_game", "best_selling_game", "games_sold"] },
    { id: "power", title: "Power", keys: ["power", "battery", "charging"] },
    { id: "body", title: "Body", keys: ["dimensions", "weight", "colors", "colours"] },
  ],
  camera: [
    { id: "sensor", title: "Sensor", keys: ["sensor", "sensor_type", "sensor_size", "sensor_resolution", "res", "resolution", "recording_medium", "storage"] },
    { id: "optics", title: "Optics", keys: ["lens", "lens_mount", "focus", "farea", "fmode", "viewfinder", "magnification", "coverage"] },
    { id: "exposure", title: "Exposure", keys: ["shutter", "shutter_speeds", "iso_range", "emode", "mmode", "metering", "flash", "fsynch", "cont"] },
    { id: "body", title: "Body", keys: ["dimensions", "weight", "body_comp_feats", "rearlcd", "battery", "made_in"] },
    { id: "video", title: "Video", keys: ["vidrecord", "video", "movie"] },
  ],
  car: [
    { id: "drivetrain", title: "Drivetrain", keys: ["engine", "motor", "transmission", "drivetrain", "layout", "powerout", "power", "torque"] },
    { id: "range", title: "Range & energy", keys: ["battery", "electric_range", "range", "charging", "fuel_capacity", "economy", "emissions"] },
    { id: "chassis", title: "Chassis", keys: ["platform", "body_style", "doors", "wheelbase", "length", "width", "height", "weight", "suspension", "brakes", "tires"] },
    { id: "build", title: "Build", keys: ["manufacturer", "production", "model_years", "assembly", "designer", "class", "aka", "sp", "model_code"] },
  ],
  motorcycle: [
    { id: "drivetrain", title: "Engine & drive", keys: ["engine", "power", "torque", "transmission", "bore_stroke", "compression_ratio", "top_speed", "ignition", "fuel_system"] },
    { id: "chassis", title: "Chassis", keys: ["frame", "suspension", "brakes", "tires", "rake_trail", "wheelbase", "dimensions", "seat_height", "dry_weight", "wet_weight", "weight", "fuel_capacity", "oil_capacity"] },
    { id: "build", title: "Build", keys: ["manufacturer", "production", "model_year", "assembly", "class", "predecessor", "successor", "related", "aka"] },
  ],
  component: [
    { id: "core", title: "Core", keys: ["cpuid", "arch", "microarch", "core", "cores", "threads", "process", "transistors", "die_size", "slowest", "fastest", "clock", "boost"] },
    { id: "memory", title: "Memory", keys: ["memory", "memory_type", "memory_bus", "memory_bandwidth", "cache", "l1cache", "l2cache", "l3cache"] },
    { id: "power", title: "Power & thermals", keys: ["power", "tdp", "voltage", "temperature"] },
    { id: "build", title: "Build", keys: ["manufacturer", "designfirm", "produced", "introduced", "discontinued", "socket", "interface", "predecessor", "successor"] },
  ],
};

/** Rows every category shows first, in this order, when the article has them. */
const OVERVIEW_KEYS = [
  "manufacturer",
  "developer",
  "brand",
  "make",
  "type",
  "class",
  "series",
  "family",
  "generation",
  "release_date",
  "released",
  "introduced",
  "production",
  "discontinued",
  "price",
  "units_sold",
];

/**
 * Turn parsed infobox fields into the cards the sheet renders.
 *
 * Two rules do the work: the overview card always leads (so "who made it, when,
 * how much" is never buried in an alphabetical dump), and *nothing is dropped* —
 * a key no group claims lands in "More specifications". The app is for reading
 * the whole sheet, so hiding a row because this file didn't anticipate it would
 * defeat the point.
 */
export function groupFields(box: ParsedInfobox, category: ProductCategory): SpecGroup[] {
  const byKey = new Map(box.fields.map((f) => [f.key, f.value]));
  const used = new Set<string>();

  const take = (keys: string[]): SpecField[] => {
    const out: SpecField[] = [];
    for (const key of keys) {
      const value = byKey.get(key);
      if (value === undefined || used.has(key)) continue;
      used.add(key);
      out.push({ key, label: labelFor(key), value });
    }
    return out;
  };

  const groups: SpecGroup[] = [];

  const overview = take(OVERVIEW_KEYS);
  if (overview.length) groups.push({ id: "overview", title: "Overview", fields: overview });

  for (const def of GROUPS[category] ?? []) {
    const fields = take(def.keys);
    if (fields.length) groups.push({ id: def.id, title: def.title, fields });
  }

  // Everything the lists above didn't name, in the article's own order. For an
  // uncategorised product this is the entire sheet, which is the intent.
  const rest = box.fields
    .filter((f) => !used.has(f.key))
    // The relation rows have a place of their own on the sheet (the Similar
    // tab), so listing them again here would be the same fact twice.
    .filter((f) => !["predecessor", "successor", "related"].includes(f.key) || category === "other")
    .map((f) => ({ key: f.key, label: labelFor(f.key), value: f.value }));

  if (rest.length) {
    groups.push({
      id: "more",
      title: groups.length ? "More specifications" : "Specifications",
      fields: rest,
    });
  }

  return groups;
}
