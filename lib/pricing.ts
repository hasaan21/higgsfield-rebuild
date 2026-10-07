import { durationsFor, getModel, isRetired } from "@/lib/catalog/models";
import { CREDIT_USD_FLOOR, PLAN_BY_ID, PLAN_RANK } from "@/lib/catalog/plans";
import type { GenerationAction, ModelSpec, PlanId, StudioParams, User } from "@/lib/types";

export interface QuoteLine {
  label: string;
  value: string;
  ours?: boolean;
}

export type BlockReason =
  | { kind: "auth"; message: string }
  | { kind: "plan"; message: string; requiredPlan: PlanId }
  | { kind: "credits"; message: string; shortBy: number }
  | { kind: "invalid"; message: string };

export interface Quote {
  cost: number;
  unlimited: boolean;
  freeTier: boolean;
  lines: QuoteLine[];
  balanceAfter: number | null;
  blocked: BlockReason | null;
}

const half = (n: number) => Math.round(n * 2) / 2;
const halfUp = (n: number) => Math.ceil(n * 2) / 2;

/** Credits must cover the vendor bill with this much headroom, even at the cheapest credit price. */
export const VENDOR_MARKUP = 1.25;

export function formatCredits(n: number) {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

type CostParams = Pick<StudioParams, "duration" | "resolution" | "camera" | "references"> & { audio?: boolean };

/** What the vendor bills us for one job, in USD. Zero for models that only run on the mock engine. */
export function vendorCostUsd(model: ModelSpec, params: Pick<StudioParams, "duration" | "resolution"> & { audio?: boolean }): number {
  if (!model.api) return 0;
  const withAudio = params.audio && model.supports.audio ? model.api.vendorCostUsdWithAudio?.[params.resolution] : undefined;
  const rate = withAudio ?? model.api.vendorCostUsd[params.resolution] ?? Math.max(...Object.values(model.api.vendorCostUsd));
  return model.mode === "video" ? rate * params.duration : rate;
}

export function baseCost(model: ModelSpec, params: CostParams) {
  const resFactor = model.pricing.resolution[params.resolution] ?? 1;
  const durationFactor = model.mode === "video" ? Math.pow(params.duration / 5, model.pricing.durationExponent ?? 1) : 1;
  const extraMoves = model.mode === "video" ? Math.max(0, params.camera.moves.length - 1) : 0;
  const stackFactor = 1 + 0.1 * extraMoves;
  const subjectRefs = params.references.filter((r) => r.slot === "subject").length;
  const refSurcharge = 2 * Math.floor(subjectRefs / 10);
  const raw = model.pricing.base * durationFactor * resFactor;
  const published = half(raw * stackFactor + refSurcharge);
  const vendorFloor = halfUp((vendorCostUsd(model, params) * VENDOR_MARKUP) / CREDIT_USD_FLOOR);
  return {
    raw,
    resFactor,
    durationFactor,
    stackFactor,
    extraMoves,
    refSurcharge,
    published,
    vendorFloor,
    total: Math.max(published, vendorFloor),
  };
}

export function canUseModel(model: ModelSpec, planId: PlanId) {
  return PLAN_RANK[planId] >= PLAN_RANK[model.minPlan];
}

export function quote(params: StudioParams, user: User | null, action: GenerationAction = "generate"): Quote {
  const model = getModel(params.modelId);
  const b = baseCost(model, params);
  const lines: QuoteLine[] = [];
  let cost: number;

  if (action === "generate") {
    lines.push({ label: `${model.name} base`, value: `${formatCredits(model.pricing.base)} cr` });
    if (model.mode === "video") lines.push({ label: `Duration ${params.duration}s`, value: `×${b.durationFactor.toFixed(2)}` });
    lines.push({ label: `Resolution ${params.resolution}`, value: `×${b.resFactor}` });
    if (b.extraMoves) lines.push({ label: `${b.extraMoves} stacked move${b.extraMoves > 1 ? "s" : ""}`, value: `×${b.stackFactor.toFixed(1)}`, ours: true });
    if (b.refSurcharge) lines.push({ label: "Heavy reference stack", value: `+${b.refSurcharge} cr`, ours: true });
    if (b.vendorFloor > b.published) lines.push({ label: `Raised to cover ${model.vendor}'s cost`, value: `${formatCredits(b.vendorFloor)} cr`, ours: true });
    cost = b.total;
  } else {
    cost = actionCost(action, params);
    lines.push({ label: ACTION_LABEL[action], value: `${formatCredits(cost)} cr` });
  }

  if (!params.prompt.trim() && action === "generate" && !params.references.length) {
    return { cost, unlimited: false, freeTier: false, lines, balanceAfter: null, blocked: { kind: "invalid", message: "Describe your shot or add a reference" } };
  }
  const invalid = action === "generate" ? validateForModel(model, params) : null;
  if (invalid) {
    return { cost, unlimited: false, freeTier: false, lines, balanceAfter: null, blocked: { kind: "invalid", message: invalid } };
  }
  if (!user) {
    return { cost, unlimited: false, freeTier: false, lines, balanceAfter: null, blocked: { kind: "auth", message: "Sign in to generate" } };
  }
  if (!canUseModel(model, user.planId)) {
    return {
      cost, unlimited: false, freeTier: false, lines, balanceAfter: user.credits,
      blocked: { kind: "plan", message: `${model.name} needs ${PLAN_BY_ID[model.minPlan].name} or higher`, requiredPlan: model.minPlan },
    };
  }
  if (action === "generate" && model.unlimitedOn.includes(user.planId)) {
    lines.push({ label: `Unlimited on ${PLAN_BY_ID[user.planId].name}`, value: "0 cr" });
    return { cost: 0, unlimited: true, freeTier: false, lines, balanceAfter: user.credits, blocked: null };
  }
  if (user.credits < cost && user.planId === "free" && user.freeGenerations > 0 && action === "generate") {
    lines.push({ label: `Free generation (${user.freeGenerations} left)`, value: "0 cr" });
    return { cost: 0, unlimited: false, freeTier: true, lines, balanceAfter: user.credits, blocked: null };
  }
  if (user.credits < cost) {
    return {
      cost, unlimited: false, freeTier: false, lines, balanceAfter: user.credits - cost,
      blocked: { kind: "credits", message: `Need ${formatCredits(cost - user.credits)} more credits`, shortBy: cost - user.credits },
    };
  }
  return { cost, unlimited: false, freeTier: false, lines, balanceAfter: user.credits - cost, blocked: null };
}

/** Vendor rules that settings alone can't express. Returns a user-facing message, or null when the job is valid. */
export function validateForModel(model: ModelSpec, params: StudioParams): string | null {
  if (isRetired(model.id)) return `${model.name.replace(" (retired)", "")} is no longer available — pick another model`;
  if (model.mode === "video" && !durationsFor(model, params.resolution).includes(params.duration)) {
    return `${model.name} at ${params.resolution} only supports ${durationsFor(model, params.resolution).join(", ")}s`;
  }
  if (model.id === "veo-3-1" && params.references.some((r) => r.slot === "subject") && params.duration !== 8) {
    return "Veo 3.1 needs an 8s duration when using subject references";
  }
  if (model.api?.provider === "byteplus" && params.resolution === "1080p" && params.references.some((r) => r.slot === "subject")) {
    return `${model.name} can't use subject references at 1080p — switch to 720p`;
  }
  if (params.references.some((r) => r.slot === "last") && !params.references.some((r) => r.slot === "first")) {
    return "Add a first frame to use a last frame";
  }
  return null;
}

export const ACTION_LABEL: Record<GenerationAction, string> = {
  generate: "Generate",
  upscale: "Upscale to 4K",
  extend: "Extend +5s",
  reframe: "Reframe",
  lipsync: "Lip Sync",
};

export function actionCost(action: GenerationAction, params: StudioParams): number {
  const model = getModel(params.modelId);
  const isVideo = model.mode === "video";
  switch (action) {
    case "upscale":
      return isVideo ? half(6 * (params.duration / 5)) : 2;
    case "extend":
      return half(model.pricing.base * (model.pricing.resolution[params.resolution] ?? 1));
    case "reframe":
      return isVideo ? 6 : 1;
    case "lipsync":
      return half(8 * Math.max(1, params.duration / 5));
    default:
      return baseCost(model, params).total;
  }
}
