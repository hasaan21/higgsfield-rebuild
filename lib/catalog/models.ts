import type { Mode, ModelSpec, Resolution } from "@/lib/types";

/**
 * Base rates reproduce Higgsfield's published examples (docs/AUDIT.md, S5) where available:
 * Kling 3.0 10 / 12.5 / 20 / 25, Seedance 2.0 23 / 45 / 45 / 90, Cinema Studio 25 / 50 / 50 / 100, Wan 2.7 8 / 13 / 15 / 25.
 * Other models are estimated and marked as such in the UI copy.
 *
 * Limits and `api.vendorCostUsd` follow each vendor's API docs and list prices as of Oct 2026. For models with an `api`,
 * `lib/pricing.ts` never charges less than the vendor cost plus margin, so some published rates are raised.
 */
export const MODELS: ModelSpec[] = [
  {
    id: "cinema-studio-4",
    name: "Cinema Studio 4.0",
    vendor: "Higgsfield",
    mode: "video",
    tagline: "Optical physics, genre & era control, 3-axis camera stacking",
    pricing: { base: 25, resolution: { "720p": 1, "1080p": 2, "4k": 3.2 } },
    durations: [5, 10, 15, 20, 30],
    resolutions: ["720p", "1080p", "4k"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:5", "21:9"],
    maxReferences: 50,
    supports: { firstLast: true, motionRef: true, audio: true, cinema: true },
    minPlan: "basic",
    unlimitedOn: [],
    simSeconds: 18,
    badge: "top",
  },
  {
    id: "seedance-2-5",
    name: "Seedance 2.5",
    vendor: "ByteDance",
    mode: "video",
    tagline: "The most advanced video model — native audio, lip-sync and SFX",
    pricing: { base: 28, resolution: { "480p": 0.6, "720p": 1 } },
    durations: [5, 10, 15],
    resolutions: ["480p", "720p"],
    aspectRatios: ["16:9", "9:16", "1:1", "21:9"],
    maxReferences: 9,
    supports: { firstLast: true, motionRef: false, audio: true, cinema: false },
    minPlan: "plus",
    unlimitedOn: [],
    simSeconds: 16,
    badge: "new",
    api: {
      provider: "byteplus",
      vendorModelId: "dreamina-seedance-2-5-260628",
      vendorCostUsd: { "480p": 0.103, "720p": 0.231 },
      etaSeconds: 120,
    },
  },
  {
    id: "seedance-2-0",
    name: "Seedance 2.0",
    vendor: "ByteDance",
    mode: "video",
    tagline: "Native audio-video: synced lip-sync, SFX and music in one pass",
    pricing: { base: 23, resolution: { "720p": 1, "1080p": 1.96 } },
    durations: [5, 10],
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16", "1:1", "21:9"],
    maxReferences: 9,
    supports: { firstLast: true, motionRef: false, audio: true, cinema: false },
    minPlan: "basic",
    unlimitedOn: ["ultra"],
    simSeconds: 14,
    api: {
      provider: "byteplus",
      vendorModelId: "dreamina-seedance-2-0-260128",
      vendorCostUsd: { "720p": 0.15, "1080p": 0.37 },
      etaSeconds: 90,
    },
  },
  {
    id: "kling-3-0",
    name: "Kling 3.0",
    vendor: "Kuaishou",
    mode: "video",
    tagline: "The new standard in photorealism with complex motion",
    pricing: { base: 10, resolution: { "720p": 1, "1080p": 1.25, "4k": 3 } },
    durations: [5, 10, 15],
    resolutions: ["720p", "1080p", "4k"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxReferences: 0,
    supports: { firstLast: true, motionRef: false, audio: true, cinema: false },
    minPlan: "free",
    unlimitedOn: ["plus", "ultra"],
    simSeconds: 10,
    api: {
      provider: "kling",
      vendorModelId: "kling-3.0",
      vendorCostUsd: { "720p": 0.084, "1080p": 0.112, "4k": 0.42 },
      vendorCostUsdWithAudio: { "720p": 0.126, "1080p": 0.168, "4k": 0.42 },
      etaSeconds: 120,
    },
  },
  {
    id: "kling-o1",
    name: "Kling o1",
    vendor: "Kuaishou",
    mode: "video",
    tagline: "Reasoning model for complex, multi-layered scene composition",
    pricing: { base: 16, resolution: { "720p": 1, "1080p": 1.4 } },
    durations: [5, 10],
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxReferences: 7,
    supports: { firstLast: true, motionRef: false, audio: false, cinema: false },
    minPlan: "plus",
    unlimitedOn: [],
    simSeconds: 15,
  },
  {
    id: "kling-2-6",
    name: "Kling 2.6",
    vendor: "Kuaishou",
    mode: "video",
    tagline: "Proven engine for fast, stable character animation",
    pricing: { base: 7, resolution: { "720p": 1, "1080p": 1.3 } },
    durations: [5, 10],
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxReferences: 0,
    supports: { firstLast: true, motionRef: false, audio: false, cinema: false },
    minPlan: "free",
    unlimitedOn: [],
    simSeconds: 8,
    api: {
      provider: "kling",
      vendorModelId: "kling-2.6",
      vendorCostUsd: { "720p": 0.042, "1080p": 0.07 },
      etaSeconds: 90,
    },
  },
  {
    id: "veo-3-1",
    name: "Veo 3.1",
    vendor: "Google",
    mode: "video",
    tagline: "Crystal-clear 4K with native cinematic visual flow",
    pricing: { base: 30, resolution: { "720p": 1, "1080p": 1.6, "4k": 2.8 } },
    durations: [4, 6, 8],
    durationsByResolution: { "1080p": [8], "4k": [8] },
    resolutions: ["720p", "1080p", "4k"],
    aspectRatios: ["16:9", "9:16"],
    maxReferences: 3,
    supports: { firstLast: true, motionRef: false, audio: true, cinema: false },
    minPlan: "plus",
    unlimitedOn: [],
    simSeconds: 17,
    api: {
      provider: "google",
      vendorModelId: "veo-3.1-generate-preview",
      vendorCostUsd: { "720p": 0.4, "1080p": 0.4, "4k": 0.6 },
      etaSeconds: 90,
    },
  },
  {
    id: "wan-2-7",
    name: "Wan 2.7",
    vendor: "Alibaba",
    mode: "video",
    tagline: "The balance of generation speed and visual richness",
    pricing: { base: 8, resolution: { "720p": 1, "1080p": 1.63 }, durationExponent: 0.926 },
    durations: [5, 10, 15],
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    maxReferences: 0,
    supports: { firstLast: true, motionRef: false, audio: false, cinema: false },
    minPlan: "free",
    unlimitedOn: [],
    simSeconds: 7,
    api: {
      provider: "alibaba",
      vendorModelId: "wan2.7-t2v",
      vendorCostUsd: { "720p": 0.1, "1080p": 0.15 },
      etaSeconds: 180,
    },
  },
  {
    id: "soul-2",
    name: "Soul 2.0",
    vendor: "Higgsfield",
    mode: "image",
    tagline: "Fashion-grade photo model with Soul ID character lock",
    pricing: { base: 2, resolution: { "1080p": 1, "4k": 2 } },
    durations: [0],
    resolutions: ["1080p", "4k"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:5", "21:9"],
    maxReferences: 4,
    supports: { firstLast: false, motionRef: false, audio: false, cinema: false },
    minPlan: "free",
    unlimitedOn: ["plus", "ultra"],
    simSeconds: 6,
  },
  {
    id: "soul-cinema",
    name: "Soul Cinema",
    vendor: "Higgsfield",
    mode: "image",
    tagline: "Cinematic-grade stills in one click — the photography side of Cinema Studio",
    pricing: { base: 3, resolution: { "1080p": 1, "4k": 2 } },
    durations: [0],
    resolutions: ["1080p", "4k"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:5", "21:9"],
    maxReferences: 14,
    supports: { firstLast: false, motionRef: false, audio: false, cinema: true },
    minPlan: "basic",
    unlimitedOn: [],
    simSeconds: 7,
    badge: "new",
  },
  {
    id: "nano-banana-2-1",
    name: "Nano Banana 2.1",
    vendor: "Google",
    mode: "image",
    tagline: "Bring up to 14 references into one 4K visual",
    pricing: { base: 2, resolution: { "1080p": 1, "4k": 2.5 } },
    durations: [0],
    resolutions: ["1080p", "4k"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:5", "21:9"],
    maxReferences: 14,
    supports: { firstLast: false, motionRef: false, audio: false, cinema: false },
    minPlan: "free",
    unlimitedOn: ["ultra"],
    simSeconds: 5,
    api: {
      provider: "google",
      vendorModelId: "gemini-nano-banana-2.1",
      vendorCostUsd: { "1080p": 0.0504, "4k": 0.0756 },
      etaSeconds: 20,
    },
  },
];

/** No longer selectable, but still resolvable so older library items and seeds keep their name. */
const RETIRED: ModelSpec[] = [
  {
    id: "sora-2",
    name: "Sora 2 (retired)",
    vendor: "OpenAI",
    mode: "video",
    tagline: "OpenAI shut down the Sora API on Sep 24, 2026",
    pricing: { base: 26, resolution: { "720p": 1, "1080p": 1.8 } },
    durations: [4, 8, 12],
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16"],
    maxReferences: 1,
    supports: { firstLast: false, motionRef: false, audio: true, cinema: false },
    minPlan: "plus",
    unlimitedOn: [],
    simSeconds: 16,
  },
];

export const MODEL_BY_ID = Object.fromEntries([...MODELS, ...RETIRED].map((m) => [m.id, m])) as Record<string, ModelSpec>;

export const isRetired = (id: string) => RETIRED.some((m) => m.id === id);

export function getModel(id: string): ModelSpec {
  return MODEL_BY_ID[id] ?? MODELS[0];
}

const STATIC_DEFAULT: Record<Mode, string> = { video: "cinema-studio-4", image: "soul-cinema" };
const LIVE_DEFAULT: Record<Mode, string> = { video: "kling-3-0", image: "nano-banana-2-1" };

/** With `liveModelIds` from the backend, prefer a model that really generates over a demo-only one. */
export function defaultModelFor(mode: Mode, liveModelIds?: readonly string[]): ModelSpec {
  if (liveModelIds?.includes(LIVE_DEFAULT[mode])) return MODEL_BY_ID[LIVE_DEFAULT[mode]];
  return MODEL_BY_ID[STATIC_DEFAULT[mode]];
}

export function durationsFor(model: ModelSpec, resolution: Resolution): number[] {
  return model.durationsByResolution?.[resolution] ?? model.durations;
}
