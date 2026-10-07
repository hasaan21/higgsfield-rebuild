export type Mode = "video" | "image";
export type Resolution = "480p" | "720p" | "1080p" | "4k";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
export type PlanId = "free" | "basic" | "plus" | "ultra";

export type ProviderId = "kling" | "google" | "byteplus" | "alibaba";

/** How a model is reached on its vendor's own API. Models without one only ever run on the mock engine. */
export interface VendorApi {
  provider: ProviderId;
  vendorModelId: string;
  /** Vendor list price in USD per output second (video) or per image, by resolution. */
  vendorCostUsd: Partial<Record<Resolution, number>>;
  vendorCostUsdWithAudio?: Partial<Record<Resolution, number>>;
  /** Typical wall-clock time for one job; drives the estimated progress bar. */
  etaSeconds: number;
}

export interface ModelSpec {
  id: string;
  name: string;
  vendor: string;
  mode: Mode;
  tagline: string;
  /** base = credits per 5 s at 720p (video) or per image at 1080p (image). */
  pricing: { base: number; resolution: Partial<Record<Resolution, number>>; durationExponent?: number };
  durations: number[];
  /** Resolutions that only allow some durations (Veo: 1080p and 4K are 8 s only). */
  durationsByResolution?: Partial<Record<Resolution, number[]>>;
  resolutions: Resolution[];
  aspectRatios: AspectRatio[];
  maxReferences: number;
  supports: { firstLast: boolean; motionRef: boolean; audio: boolean; cinema: boolean };
  minPlan: PlanId;
  unlimitedOn: PlanId[];
  simSeconds: number;
  badge?: "new" | "top";
  api?: VendorApi;
}

export type MoveGroup = "static" | "dolly" | "crane" | "pan-tilt" | "orbit" | "zoom" | "drone" | "handheld" | "fx";

export interface CameraMove {
  id: string;
  name: string;
  group: MoveGroup;
}

export interface Option {
  id: string;
  name: string;
  hint?: string;
  swatch?: string;
}

export type ReferenceSlot = "first" | "last" | "motion" | "subject";

export interface Reference {
  id: string;
  slot: ReferenceSlot;
  kind: "image" | "video";
  name: string;
  url: string;
  /** R2 object key for uploads made through the backend; `url` is then a short-lived signed link. */
  key?: string;
  missing?: boolean;
}

export interface StudioParams {
  mode: Mode;
  modelId: string;
  prompt: string;
  duration: number;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  audio: boolean;
  film: { genre: string; era: string; tempo: string };
  camera: { body: string; lens: string; aperture: string; moves: string[]; motionIntensity: number };
  look: { palette: string; lighting: string };
  characterId: string | null;
  emotion: string | null;
  references: Reference[];
  seed: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  credits: number;
  concurrency: number;
  watermark: boolean;
  allModels: boolean;
  highlights: string[];
}

export type AuthProviderId = "google" | "apple" | "microsoft" | "email";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProviderId | "mock";
  planId: PlanId;
  credits: number;
  freeGenerations: number;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  at: string;
  delta: number;
  balanceAfter: number;
  reason: "plan-grant" | "generation" | "refund" | "top-up";
  generationId?: string;
  note: string;
}

export type GenerationStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
export type GenerationAction = "generate" | "upscale" | "extend" | "reframe" | "lipsync";

export interface MediaRef {
  kind: "video" | "image";
  src: string;
  /** Empty when the vendor returned no still; video players then show the first frame. */
  poster: string;
  width: number;
  height: number;
  /** R2 object key when the file is stored by the backend. */
  key?: string;
}

export interface Generation {
  id: string;
  userId: string;
  action: GenerationAction;
  parentId?: string;
  params: StudioParams;
  status: GenerationStatus;
  progress: number;
  cost: number;
  /** Paid with a free-tier generation instead of credits. */
  freeTier: boolean;
  unlimited: boolean;
  refunded: boolean;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs: number;
  error?: string;
  output?: MediaRef;
  favorite: boolean;
  remixOf?: string;
  watermark: boolean;
  /** Set by the backend: which engine produced (or is producing) this job. */
  provider?: ProviderId | "mock";
}

export interface SoulCastParams {
  genre: string;
  budget: number;
  era: string;
  archetype: string;
  gender: string;
  race: string;
  age: number;
  build: string;
  height: string;
  eyeColor: string;
  hairStyle: string;
  hairColor: string;
  facialHair: string;
  details: string[];
  outfit: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  kind: "soul-id" | "soul-cast";
  status: "training" | "ready" | "failed";
  progress: number;
  createdAt: number;
  trainMs: number;
  thumbnail: string;
  photoCount?: number;
  cast?: SoulCastParams;
}

export interface CommunityPost {
  id: string;
  author: string;
  title: string;
  media: MediaRef;
  params: StudioParams;
  likes: number;
  remixes: number;
  tags: string[];
}
