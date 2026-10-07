import { defaultModelFor, durationsFor, getModel, isRetired, MODEL_BY_ID } from "@/lib/catalog/models";
import { MAX_STACKED_MOVES, MOVE_BY_ID } from "@/lib/catalog/camera";
import { APERTURES, CAMERA_BODIES, LENSES } from "@/lib/catalog/camera";
import { ERAS, GENRES, LIGHTING, PALETTES, TEMPOS } from "@/lib/catalog/film";
import type { ModelSpec, Option, StudioParams } from "@/lib/types";

export function defaultParams(): StudioParams {
  const model = defaultModelFor("video");
  return {
    mode: "video",
    modelId: model.id,
    prompt: "",
    duration: 5,
    resolution: "720p",
    aspectRatio: "16:9",
    audio: false,
    film: { genre: "general", era: "auto", tempo: "auto" },
    camera: { body: "auto", lens: "auto", aperture: "auto", moves: [], motionIntensity: 50 },
    look: { palette: "auto", lighting: "auto" },
    characterId: null,
    emotion: null,
    references: [],
    seed: Math.floor(Math.random() * 1_000_000),
  };
}

const known = (list: Option[], id: string, fallback = "auto") => (list.some((o) => o.id === id) ? id : fallback);

/** Clamp any params (e.g. from a remix or an old persisted store) to what the chosen model supports. */
export function normalizeParams(input: StudioParams): StudioParams {
  const model: ModelSpec = (!isRetired(input.modelId) && MODEL_BY_ID[input.modelId]) || defaultModelFor(input.mode);
  const p: StudioParams = structuredClone(input);
  p.modelId = model.id;
  p.mode = model.mode;
  if (!model.resolutions.includes(p.resolution)) p.resolution = model.resolutions[0];
  const durations = durationsFor(model, p.resolution);
  if (!durations.includes(p.duration)) p.duration = durations[0];
  if (!model.aspectRatios.includes(p.aspectRatio)) p.aspectRatio = model.aspectRatios[0];
  if (!model.supports.audio) p.audio = false;
  p.film = {
    genre: known(GENRES, p.film?.genre, "general"),
    era: known(ERAS, p.film?.era),
    tempo: known(TEMPOS, p.film?.tempo),
  };
  p.camera = {
    body: known(CAMERA_BODIES, p.camera?.body),
    lens: known(LENSES, p.camera?.lens),
    aperture: known(APERTURES, p.camera?.aperture),
    moves: (p.camera?.moves ?? []).filter((id) => MOVE_BY_ID[id]).slice(0, MAX_STACKED_MOVES),
    motionIntensity: Math.min(100, Math.max(0, p.camera?.motionIntensity ?? 50)),
  };
  p.look = { palette: known(PALETTES, p.look?.palette), lighting: known(LIGHTING, p.look?.lighting) };
  p.references = (p.references ?? []).filter((r) => {
    if (r.slot === "motion") return model.supports.motionRef;
    if (r.slot === "first" || r.slot === "last") return model.supports.firstLast;
    return true;
  });
  return p;
}

export function switchModel(params: StudioParams, modelId: string): StudioParams {
  return normalizeParams({ ...params, modelId, mode: getModel(modelId).mode });
}
