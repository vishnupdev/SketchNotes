/**
 * The passphrase wordlist.
 *
 * Exactly 256 words, which is the whole reason for the count: one word is one
 * byte of randomness, so a phrase's entropy is `8 × words` with no arithmetic
 * to get subtly wrong, and a word can be chosen from a single random byte with
 * no modulo bias to reason about.
 *
 * Chosen for typing, not for size. Every word is lowercase a–z, three to nine
 * letters, spelled one way, and concrete enough to picture — because a
 * passphrase's advantage over a password is entirely that it can be remembered
 * and read aloud, and a list full of homophones and near-misses throws that
 * away. They are spread across the alphabet on purpose: a list that ran a–e
 * would generate phrases that look, wrongly, like a bug.
 *
 * 8 bits a word is less than the EFF long list's 12.9, so a phrase here needs
 * more words for the same strength. `lib/Vault/generate.ts` computes the
 * entropy from this list's real length rather than a remembered constant, and
 * the UI reports it, so the trade is visible instead of assumed.
 */
export const WORDS: readonly string[] = [
  "able", "acorn", "actor", "agent", "album", "alert", "almond", "amber",
  "anchor", "apple", "arena", "arrow", "bacon", "badge", "bagel", "bamboo",
  "banjo", "barley", "basil", "basket", "beacon", "beetle", "bench", "berry",
  "birch", "bison", "bobcat", "cabin", "cactus", "camel", "camera", "canal",
  "candle", "canoe", "canvas", "canyon", "carpet", "carrot", "castle", "cedar",
  "cellar", "chalk", "cherry", "clover", "dagger", "daisy", "dance", "dawn",
  "decade", "deer", "delta", "denim", "desert", "diamond", "dolphin", "dragon",
  "eagle", "earring", "easel", "echo", "eclipse", "elbow", "elder", "ember",
  "emerald", "engine", "fable", "fabric", "falcon", "fennel", "fern", "ferry",
  "fiddle", "filter", "finch", "flame", "flint", "forest", "gadget", "gallery",
  "garden", "garlic", "gazelle", "ginger", "giraffe", "glacier", "glider",
  "granite", "gravel", "guitar", "habitat", "hammer", "harbor", "harvest",
  "hazel", "helmet", "heron", "hickory", "hollow", "hornet", "iceberg", "igloo",
  "impala", "index", "indigo", "ingot", "insect", "ivory", "jacket", "jaguar",
  "jasmine", "jelly", "jersey", "jigsaw", "jungle", "kayak", "kennel", "kettle",
  "keystone", "kitten", "kiwi", "koala", "lantern", "lapel", "larch", "lasso",
  "lattice", "lava", "ledger", "lemon", "lentil", "lilac", "lobster", "magnet",
  "mahogany", "mallet", "mango", "maple", "marble", "marigold", "meadow",
  "medal", "melon", "mentor", "mineral", "mosaic", "mustard", "napkin",
  "nectar", "needle", "nephew", "nickel", "noodle", "nozzle", "nutmeg", "oasis",
  "oatmeal", "obsidian", "ocelot", "octave", "olive", "onyx", "orbit", "otter",
  "palette", "pancake", "panda", "papaya", "paprika", "parcel", "parsley",
  "pasture", "peacock", "pebble", "pelican", "pepper", "pewter", "pigment",
  "pumpkin", "quarry", "quartz", "quilt", "quiver", "rabbit", "radish",
  "rafter", "ranger", "rattle", "raven", "ribbon", "rocket", "rosemary",
  "rubble", "rudder", "saddle", "saffron", "sailor", "salmon", "sandal",
  "sapphire", "satchel", "scarlet", "sequoia", "shovel", "silver", "sonnet",
  "sparrow", "spruce", "stencil", "sundial", "sunset", "tablet", "tadpole",
  "talon", "tangerine", "tapestry", "teapot", "temple", "thicket", "thimble",
  "thistle", "timber", "trellis", "turquoise", "ukulele", "umbrella", "unicorn",
  "upland", "urchin", "valley", "vanilla", "velvet", "vessel", "vinegar",
  "violet", "vulture", "waffle", "wagon", "walnut", "walrus", "wander",
  "warbler", "whisker", "willow", "window", "wombat", "xylophone", "yarrow",
  "yellow", "yeti", "yonder", "zebra", "zenith", "zephyr", "zinnia", "zither",
];

/** Bits of entropy each word contributes, from the list's real length. */
export const BITS_PER_WORD = Math.log2(WORDS.length);
