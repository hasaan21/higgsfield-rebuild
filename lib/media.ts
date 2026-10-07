import type { AspectRatio, MediaRef } from "@/lib/types";

export interface MediaClip {
  id: string;
  title: string;
  aspect: AspectRatio;
  width: number;
  height: number;
  mood: string[];
}

/** Rendered by scripts/gen-media.sh. */
export const MEDIA: MediaClip[] = [
  { id: "dune", title: "Amber Haze", aspect: "16:9", width: 1280, height: 720, mood: ["warm", "desert", "dusk"] },
  { id: "tide", title: "Deep Tide", aspect: "21:9", width: 1344, height: 576, mood: ["ocean", "blue", "calm"] },
  { id: "aurora", title: "Aurora Veil", aspect: "9:16", width: 720, height: 1280, mood: ["night", "sky", "neon"] },
  { id: "nebula", title: "Violet Fractal", aspect: "16:9", width: 1280, height: 720, mood: ["space", "sci-fi", "zoom"] },
  { id: "cells", title: "Biolume", aspect: "1:1", width: 960, height: 960, mood: ["organic", "neon", "micro"] },
  { id: "embers", title: "Embers", aspect: "9:16", width: 720, height: 1280, mood: ["fire", "night", "action"] },
  { id: "storm", title: "Slate Storm", aspect: "16:9", width: 1280, height: 720, mood: ["storm", "moody", "thriller"] },
  { id: "prism", title: "Prism Bloom", aspect: "1:1", width: 960, height: 960, mood: ["pop", "fashion", "color"] },
  { id: "noir", title: "Noir Smoke", aspect: "21:9", width: 1344, height: 576, mood: ["noir", "mono", "drama"] },
  { id: "lagoon", title: "Lagoon", aspect: "4:5", width: 864, height: 1080, mood: ["nature", "green", "calm"] },
];

const RATIO: Record<AspectRatio, number> = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "21:9": 21 / 9 };

export function mediaRef(clip: MediaClip, kind: "video" | "image" = "video"): MediaRef {
  return {
    kind,
    src: kind === "video" ? `/media/${clip.id}.mp4` : `/media/${clip.id}.jpg`,
    poster: `/media/${clip.id}.jpg`,
    width: clip.width,
    height: clip.height,
  };
}

/** Deterministically pick the clip whose aspect ratio is closest to the request. */
export function pickClip(seed: number, aspect: AspectRatio): MediaClip {
  const target = RATIO[aspect];
  const ranked = [...MEDIA].sort(
    (a, b) => Math.abs(Math.log(RATIO[a.aspect] / target)) - Math.abs(Math.log(RATIO[b.aspect] / target)),
  );
  const best = Math.abs(Math.log(RATIO[ranked[0].aspect] / target));
  const pool = ranked.filter((c) => Math.abs(Math.log(RATIO[c.aspect] / target)) - best < 0.01);
  return pool[Math.abs(seed) % pool.length];
}
