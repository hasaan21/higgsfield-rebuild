import type { AspectRatio, Option, Resolution } from "@/lib/types";

/** Cinema Studio 4.0 controls (docs/AUDIT.md, S4). */
export const GENRES: Option[] = [
  { id: "general", name: "General", hint: "No genre logic — the prompt drives the look" },
  { id: "action", name: "Action", hint: "Camera tied to the moving subject" },
  { id: "epic", name: "Epic", hint: "Wide, environment as subject" },
  { id: "drama", name: "Drama", hint: "Closer, held moments, light on faces" },
  { id: "comedy", name: "Comedy", hint: "Open framing, room to react" },
  { id: "horror", name: "Horror", hint: "Off-angle framing, withheld light" },
  { id: "noir", name: "Noir", hint: "Hard shadow, high contrast" },
];

export const ERAS: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "60s", name: "60s" },
  { id: "80s", name: "80s" },
  { id: "90s", name: "90s" },
  { id: "2000s", name: "2000s" },
  { id: "2010s", name: "2010s" },
  { id: "2020s", name: "2020s" },
];

export const TEMPOS: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "chaotic", name: "Chaotic", hint: "Fast, unresolved cuts" },
  { id: "dynamic", name: "Dynamic", hint: "Forward momentum" },
  { id: "calm", name: "Calm", hint: "Long takes" },
  { id: "single-shot", name: "Single Shot", hint: "One continuous take" },
];

export const PALETTES: Option[] = [
  { id: "auto", name: "Auto", swatch: "linear-gradient(135deg,#444,#888)" },
  { id: "film-colors", name: "Film Colors", swatch: "linear-gradient(135deg,#3d5a40,#c9a96e,#7a2e2e)" },
  { id: "black-gloss", name: "Black Gloss", swatch: "linear-gradient(135deg,#050505,#2a2a2a,#d9d9d9)" },
  { id: "candy-pink", name: "Candy Pink", swatch: "linear-gradient(135deg,#ff8fb1,#ffd1dc,#b5179e)" },
  { id: "lime-jam", name: "Lime Jam", swatch: "linear-gradient(135deg,#c6f432,#2d6a4f,#f9f871)" },
  { id: "nostalgic-blue", name: "Nostalgic Blue", swatch: "linear-gradient(135deg,#1d3557,#457b9d,#e9d8a6)" },
  { id: "teal-orange", name: "Teal & Orange", swatch: "linear-gradient(135deg,#006d77,#83c5be,#e29578)" },
  { id: "bleach-bypass", name: "Bleach Bypass", swatch: "linear-gradient(135deg,#3a3a3a,#9a9a8a,#e0e0d0)" },
  { id: "neon-noir", name: "Neon Noir", swatch: "linear-gradient(135deg,#10002b,#ff006e,#3a86ff)" },
  { id: "golden-hour", name: "Golden Hour", swatch: "linear-gradient(135deg,#ff9e00,#ffd166,#9d0208)" },
  { id: "arctic", name: "Arctic", swatch: "linear-gradient(135deg,#caf0f8,#90e0ef,#0077b6)" },
  { id: "sepia", name: "Sepia", swatch: "linear-gradient(135deg,#704214,#c8a165,#f3e5c0)" },
];

export const LIGHTING: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "silhouette", name: "Silhouette", hint: "Backlit dark outline" },
  { id: "practicals", name: "Practicals", hint: "Lit by in-frame sources" },
  { id: "window", name: "Window", hint: "Directional daylight" },
  { id: "overhead-fall", name: "Overhead Fall", hint: "Hard top light" },
  { id: "contre-jour", name: "Contre-jour", hint: "Into the light, with flare" },
  { id: "soft-cross", name: "Soft Cross", hint: "Two soft crossing sources" },
];

export const EMOTIONS: Option[] = [
  { id: "hope", name: "Hope", swatch: "#ffd166" },
  { id: "anger", name: "Anger", swatch: "#ef233c" },
  { id: "joy", name: "Joy", swatch: "#ffb703" },
  { id: "trust", name: "Trust", swatch: "#80ed99" },
  { id: "fear", name: "Fear", swatch: "#7209b7" },
  { id: "surprise", name: "Surprise", swatch: "#4cc9f0" },
  { id: "sadness", name: "Sadness", swatch: "#4361ee" },
  { id: "disgust", name: "Disgust", swatch: "#6a994e" },
];

export const ASPECT_LABEL: Record<AspectRatio, string> = {
  "16:9": "Widescreen",
  "9:16": "Vertical",
  "1:1": "Square",
  "4:5": "Portrait",
  "21:9": "Cinemascope",
};

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  "480p": "480p",
  "720p": "720p",
  "1080p": "1080p",
  "4k": "4K",
};

export function optionName(list: Option[], id: string | null | undefined) {
  return list.find((o) => o.id === id)?.name ?? "Auto";
}
