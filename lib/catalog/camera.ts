import type { CameraMove, MoveGroup, Option } from "@/lib/types";

/** Preset names from higgsfield.ai/camera-controls (docs/AUDIT.md, S3), plus the 4.0 additions (S4). */
const RAW: [string, MoveGroup][] = [
  ["Static", "static"],
  ["Dolly In", "dolly"],
  ["Dolly Out", "dolly"],
  ["Dolly Left", "dolly"],
  ["Dolly Right", "dolly"],
  ["Super Dolly In", "dolly"],
  ["Super Dolly Out", "dolly"],
  ["Double Dolly", "dolly"],
  ["Dolly Zoom In", "zoom"],
  ["Dolly Zoom Out", "zoom"],
  ["Zoom In", "zoom"],
  ["Zoom Out", "zoom"],
  ["Crash Zoom In", "zoom"],
  ["Crash Zoom Out", "zoom"],
  ["Rapid Zoom In", "zoom"],
  ["Rapid Zoom Out", "zoom"],
  ["YoYo Zoom", "zoom"],
  ["Eating Zoom", "zoom"],
  ["Pan Left", "pan-tilt"],
  ["Pan Right", "pan-tilt"],
  ["Whip Pan", "pan-tilt"],
  ["Tilt Up", "pan-tilt"],
  ["Tilt Down", "pan-tilt"],
  ["Dutch Angle", "pan-tilt"],
  ["Crane Up", "crane"],
  ["Crane Down", "crane"],
  ["Crane Over The Head", "crane"],
  ["Jib Up", "crane"],
  ["Jib Down", "crane"],
  ["Pedestal Down", "crane"],
  ["Robo Arm", "crane"],
  ["Arc Left", "orbit"],
  ["Arc Right", "orbit"],
  ["360 Orbit", "orbit"],
  ["3D Rotation", "orbit"],
  ["Lazy Susan", "orbit"],
  ["Bullet Time", "orbit"],
  ["Aerial Pullback", "drone"],
  ["FPV Drone", "drone"],
  ["Helicopter Shot", "drone"],
  ["Overhead", "drone"],
  ["Road Rush", "drone"],
  ["Flying Cam Transition", "drone"],
  ["Handheld", "handheld"],
  ["Head Tracking", "handheld"],
  ["Snorricam", "handheld"],
  ["Hero Cam", "handheld"],
  ["Wiggle", "handheld"],
  ["Car Grip", "handheld"],
  ["Car Chasing", "handheld"],
  ["Buckle Up", "handheld"],
  ["Tracking Shot", "handheld"],
  ["POV", "handheld"],
  ["Object POV", "fx"],
  ["Through Object In", "fx"],
  ["Through Object Out", "fx"],
  ["Eyes In", "fx"],
  ["Mouth In", "fx"],
  ["Fisheye", "fx"],
  ["Focus Change", "fx"],
  ["Low Shutter", "fx"],
  ["Hyperlapse", "fx"],
  ["Timelapse Landscape", "fx"],
  ["Timelapse Human", "fx"],
  ["Timelapse Glam", "fx"],
  ["Incline", "fx"],
  ["Glam", "fx"],
  ["BTS", "fx"],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const CAMERA_MOVES: CameraMove[] = RAW.map(([name, group]) => ({ id: slug(name), name, group }));
export const MOVE_BY_ID = Object.fromEntries(CAMERA_MOVES.map((m) => [m.id, m])) as Record<string, CameraMove>;
export const MAX_STACKED_MOVES = 3;

export const MOVE_GROUPS: { id: MoveGroup; name: string }[] = [
  { id: "dolly", name: "Dolly" },
  { id: "zoom", name: "Zoom" },
  { id: "pan-tilt", name: "Pan & Tilt" },
  { id: "crane", name: "Crane & Arm" },
  { id: "orbit", name: "Orbit" },
  { id: "drone", name: "Aerial" },
  { id: "handheld", name: "Handheld & POV" },
  { id: "fx", name: "Specialty" },
  { id: "static", name: "Static" },
];

/** Moves that cannot share a stack because they fight over the same axis. */
const EXCLUSIVE: MoveGroup[] = ["static"];

export function canStack(current: string[], candidate: string): { ok: boolean; reason?: string } {
  if (current.includes(candidate)) return { ok: false, reason: "Already in the stack" };
  if (current.length >= MAX_STACKED_MOVES) return { ok: false, reason: `Up to ${MAX_STACKED_MOVES} moves can be stacked` };
  const cand = MOVE_BY_ID[candidate];
  if (!cand) return { ok: false, reason: "Unknown move" };
  if (current.length && (EXCLUSIVE.includes(cand.group) || current.some((id) => EXCLUSIVE.includes(MOVE_BY_ID[id]?.group)))) {
    return { ok: false, reason: "Static can't be combined with other moves" };
  }
  return { ok: true };
}

export const CAMERA_BODIES: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "modern", name: "Modern", hint: "Clean, high-resolution digital" },
  { id: "35mm", name: "35mm Film", hint: "Grain structure and analog warmth" },
  { id: "8mm", name: "8mm Film", hint: "Soft home-movie texture" },
  { id: "dv", name: "DV Camcorder", hint: "Flat colour, tape compression" },
];

export const LENSES: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "clean-sharp", name: "Clean Sharp", hint: "Max resolution, minimal aberration" },
  { id: "anamorphic", name: "Anamorphic", hint: "Oval bokeh, horizontal flare" },
  { id: "vintage-anamorphic", name: "Vintage Anamorphic", hint: "Low contrast, chromatic aberration" },
  { id: "warm-vintage", name: "Warm Vintage", hint: "Diffusion, blooming highlights" },
  { id: "halation-vintage", name: "Halation Vintage", hint: "Red halo around highlights" },
];

export const APERTURES: Option[] = [
  { id: "auto", name: "Auto" },
  { id: "f1.4", name: "f/1.4", hint: "Wide open — subject isolated" },
  { id: "f4", name: "f/4", hint: "Moderate falloff" },
  { id: "f11", name: "f/11", hint: "Deep focus front to back" },
];
