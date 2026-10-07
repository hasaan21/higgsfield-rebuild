import { APERTURES, CAMERA_BODIES, LENSES, MOVE_BY_ID } from "@/lib/catalog/camera";
import { EMOTIONS, ERAS, GENRES, LIGHTING, optionName, PALETTES, TEMPOS } from "@/lib/catalog/film";
import type { StudioParams } from "@/lib/types";

const INTENSITY = ["very subtle", "subtle", "moderate", "strong", "dramatic"];

/**
 * Vendor models only take text, so the Cinema Studio controls are appended as plain-language direction.
 * Anything left on "auto" adds nothing; the user's own prompt always comes first.
 */
export function buildPrompt(params: StudioParams): string {
  const parts: string[] = [];
  const pick = (label: string, list: Parameters<typeof optionName>[0], id: string | null | undefined, skip = "auto") => {
    if (id && id !== skip) parts.push(`${label}: ${optionName(list, id)}`);
  };

  pick("Genre", GENRES, params.film.genre, "general");
  pick("Era", ERAS, params.film.era);
  if (params.mode === "video") pick("Tempo", TEMPOS, params.film.tempo);
  pick("Camera", CAMERA_BODIES, params.camera.body);
  pick("Lens", LENSES, params.camera.lens);
  pick("Aperture", APERTURES, params.camera.aperture);
  if (params.mode === "video" && params.camera.moves.length) {
    const moves = params.camera.moves.map((m) => MOVE_BY_ID[m]?.name).filter(Boolean).join(", then ");
    const level = INTENSITY[Math.min(INTENSITY.length - 1, Math.floor(params.camera.motionIntensity / 21))];
    parts.push(`Camera movement: ${moves} (${level} motion)`);
  }
  pick("Colour palette", PALETTES, params.look.palette);
  pick("Lighting", LIGHTING, params.look.lighting);
  pick("Performance", EMOTIONS, params.emotion, "");

  const prompt = params.prompt.trim();
  if (!parts.length) return prompt;
  return `${prompt}${prompt ? "\n\n" : ""}Direction — ${parts.join("; ")}.`;
}
