import { MEDIA, mediaRef } from "@/lib/media";
import { normalizeParams } from "@/lib/studio-defaults";
import { defaultModelFor } from "@/lib/catalog/models";
import type { CommunityPost, Mode, StudioParams } from "@/lib/types";

interface Seed {
  clip: string;
  kind: Mode;
  author: string;
  title: string;
  prompt: string;
  model?: string;
  genre?: string;
  era?: string;
  tempo?: string;
  moves?: string[];
  palette?: string;
  lighting?: string;
  lens?: string;
  body?: string;
  duration?: number;
  tags: string[];
}

const SEEDS: Seed[] = [
  { clip: "dune", kind: "video", author: "mira.frames", title: "Last caravan", prompt: "A caravan crosses endless dunes at dusk, heat haze bending the horizon", genre: "epic", tempo: "calm", moves: ["aerial-pullback"], palette: "golden-hour", lens: "anamorphic", tags: ["epic", "desert"] },
  { clip: "storm", kind: "video", author: "noctis", title: "Front line", prompt: "Storm wall rolling over a flat plain, lightning inside the clouds", genre: "drama", moves: ["dolly-in", "tilt-up"], palette: "bleach-bypass", lighting: "overhead-fall", tags: ["weather", "moody"] },
  { clip: "nebula", kind: "video", author: "orbitlab", title: "Into the fold", prompt: "Endless zoom into a violet fractal nebula, crystalline filaments", model: "kling-3-0", genre: "general", moves: ["crash-zoom-in"], tempo: "dynamic", palette: "neon-noir", tags: ["sci-fi", "abstract"] },
  { clip: "aurora", kind: "video", author: "lumen.k", title: "Polar static", prompt: "Aurora curtains rippling above a frozen lake, vertical for reels", model: "seedance-2-5", moves: ["tilt-up"], palette: "arctic", tempo: "calm", tags: ["night", "vertical"] },
  { clip: "noir", kind: "video", author: "deckard", title: "Smoke & mirrors", prompt: "Cigarette smoke curling through a slatted-light office, 1940s detective", genre: "noir", era: "60s", moves: ["dolly-right"], palette: "black-gloss", lighting: "silhouette", body: "35mm", tags: ["noir", "mono"] },
  { clip: "embers", kind: "video", author: "pyro.studio", title: "Ash rising", prompt: "Embers spiralling upward from a bonfire, slow shutter streaks", genre: "action", moves: ["crane-up", "360-orbit"], tempo: "chaotic", palette: "teal-orange", lighting: "practicals", tags: ["fire", "vertical"] },
  { clip: "tide", kind: "video", author: "salt&lens", title: "Undertow", prompt: "Deep ocean swell under moonlight, wide anamorphic, slow push", model: "veo-3-1", moves: ["dolly-in"], tempo: "calm", palette: "nostalgic-blue", lens: "vintage-anamorphic", tags: ["ocean", "wide"] },
  { clip: "cells", kind: "video", author: "biofilm", title: "Colony", prompt: "Bioluminescent cells dividing under a microscope, neon green", model: "wan-2-7", moves: ["zoom-in"], palette: "lime-jam", tags: ["micro", "neon"] },
  { clip: "prism", kind: "video", author: "studio.vela", title: "Spectrum drop", prompt: "Liquid colour blooming through a prism for a fashion opener", genre: "comedy", moves: ["whip-pan", "dolly-zoom-in"], tempo: "dynamic", palette: "candy-pink", tags: ["fashion", "pop"] },
  { clip: "lagoon", kind: "video", author: "fernweh", title: "Still water", prompt: "Lily pads drift on a green lagoon, dragonflies skimming", model: "veo-3-1", moves: ["static"], tempo: "single-shot", palette: "film-colors", lighting: "window", tags: ["nature", "calm"] },
  { clip: "storm", kind: "video", author: "vhs.ghost", title: "Signal lost", prompt: "Grainy home-video of a thunderstorm over suburbs, 90s camcorder", genre: "horror", era: "90s", body: "dv", moves: ["handheld"], palette: "sepia", tags: ["retro", "found-footage"] },
  { clip: "dune", kind: "video", author: "kai.motion", title: "Chase at noon", prompt: "Dune buggy tearing across sand, camera mounted low on the chassis", model: "kling-o1", genre: "action", moves: ["car-chasing", "fpv-drone"], tempo: "chaotic", tags: ["action", "speed"] },
  { clip: "nebula", kind: "video", author: "orbitlab", title: "Hyperdrive", prompt: "Ship jumps to hyperspace, fractal tunnel wraps the frame", genre: "epic", moves: ["through-object-in", "rapid-zoom-in"], tempo: "chaotic", palette: "neon-noir", duration: 10, tags: ["sci-fi"] },
  { clip: "aurora", kind: "video", author: "nightjar", title: "Northern hymn", prompt: "Choir of lights over a mountain ridge, timelapse feel", model: "kling-2-6", moves: ["timelapse-landscape"], palette: "arctic", tags: ["timelapse", "night"] },
  { clip: "noir", kind: "image", author: "deckard", title: "Interrogation room", prompt: "Single bulb over a steel table, smoke in the light cone, high contrast still", genre: "noir", palette: "black-gloss", lighting: "overhead-fall", tags: ["still", "noir"] },
  { clip: "prism", kind: "image", author: "studio.vela", title: "Chroma portrait", prompt: "Editorial portrait lit through a prism, rainbow fringes on skin", model: "soul-2", palette: "candy-pink", lighting: "soft-cross", tags: ["fashion", "portrait"] },
  { clip: "lagoon", kind: "image", author: "fernweh", title: "Green hour", prompt: "Mossy lagoon at first light, mist hanging low, 4:5 for feed", model: "nano-banana-2-1", palette: "film-colors", tags: ["nature", "still"] },
  { clip: "cells", kind: "image", author: "biofilm", title: "Specimen 04", prompt: "Macro of glowing cell colony, symmetrical, poster composition", palette: "lime-jam", tags: ["macro", "poster"] },
  { clip: "dune", kind: "image", author: "mira.frames", title: "Dune key art", prompt: "Lone figure on a dune crest, huge sun, cinematic key art", era: "80s", palette: "golden-hour", lighting: "contre-jour", tags: ["key-art", "epic"] },
  { clip: "embers", kind: "image", author: "pyro.studio", title: "Forge", prompt: "Blacksmith sparks frozen mid-air, dark workshop", model: "soul-2", palette: "teal-orange", lighting: "practicals", tags: ["still", "fire"] },
  { clip: "tide", kind: "video", author: "salt&lens", title: "Moon pull", prompt: "Tide drawing out across black sand under a full moon", moves: ["crane-down", "pan-left"], palette: "nostalgic-blue", lighting: "contre-jour", tags: ["ocean"] },
  { clip: "cells", kind: "video", author: "glitchgarden", title: "Life engine", prompt: "Conway's life as living circuitry, neon pulses across the grid", genre: "general", moves: ["overhead"], tempo: "dynamic", palette: "lime-jam", tags: ["abstract", "loop"] },
  { clip: "storm", kind: "video", author: "noctis", title: "Siege", prompt: "Castle walls under a storm, banners whipping, epic scale", genre: "epic", era: "auto", moves: ["helicopter-shot", "dolly-in"], tempo: "dynamic", palette: "bleach-bypass", duration: 10, tags: ["epic", "fantasy"] },
  { clip: "prism", kind: "video", author: "kai.motion", title: "Product spin", prompt: "Glass perfume bottle rotating, light splitting into colour bands", moves: ["lazy-susan"], palette: "film-colors", lighting: "soft-cross", tags: ["product", "commercial"] },
];

function toParams(s: Seed, i: number): StudioParams {
  const clip = MEDIA.find((c) => c.id === s.clip)!;
  const model = s.model ?? defaultModelFor(s.kind).id;
  return normalizeParams({
    mode: s.kind,
    modelId: model,
    prompt: s.prompt,
    duration: s.duration ?? 5,
    resolution: "720p",
    aspectRatio: clip.aspect,
    audio: false,
    film: { genre: s.genre ?? "general", era: s.era ?? "auto", tempo: s.tempo ?? "auto" },
    camera: { body: s.body ?? "auto", lens: s.lens ?? "auto", aperture: "auto", moves: s.moves ?? [], motionIntensity: 50 },
    look: { palette: s.palette ?? "auto", lighting: s.lighting ?? "auto" },
    characterId: null,
    emotion: null,
    references: [],
    seed: 1000 + i * 7919,
  });
}

export const COMMUNITY: CommunityPost[] = SEEDS.map((s, i) => {
  const clip = MEDIA.find((c) => c.id === s.clip)!;
  return {
    id: `post_${String(i + 1).padStart(2, "0")}`,
    author: s.author,
    title: s.title,
    media: mediaRef(clip, s.kind === "video" ? "video" : "image"),
    params: toParams(s, i),
    likes: 120 + ((i * 7349) % 4800),
    remixes: 4 + ((i * 131) % 260),
    tags: s.tags,
  };
});

export const POST_BY_ID = Object.fromEntries(COMMUNITY.map((p) => [p.id, p])) as Record<string, CommunityPost>;

export const EXPLORE_FILTERS = [
  { id: "all", name: "All" },
  { id: "video", name: "Video" },
  { id: "image", name: "Image" },
  { id: "epic", name: "Epic" },
  { id: "noir", name: "Noir" },
  { id: "sci-fi", name: "Sci-fi" },
  { id: "nature", name: "Nature" },
  { id: "fashion", name: "Fashion" },
  { id: "vertical", name: "Vertical" },
] as const;
