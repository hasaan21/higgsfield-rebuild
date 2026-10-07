import { getModel } from "@/lib/catalog/models";
import { PLAN_BY_ID, PLAN_RANK } from "@/lib/catalog/plans";
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

export function formatCredits(n: number) {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

export function baseCost(model: ModelSpec, params: Pick<StudioParams, "duration" | "resolution" | "camera" | "references">) {
  const resFactor = model.pricing.resolution[params.resolution] ?? 1;
  const durationFactor = model.mode === "video" ? Math.pow(params.duration / 5, model.pricing.durationExponent ?? 1) : 1;
  const extraMoves = model.mode === "video" ? Math.max(0, params.camera.moves.length - 1) : 0;
  const stackFactor = 1 + 0.1 * extraMoves;
  const subjectRefs = params.references.filter((r) => r.slot === "subject").length;
  const refSurcharge = 2 * Math.floor(subjectRefs / 10);
  const raw = model.pricing.base * durationFactor * resFactor;
  return {
    raw,
    resFactor,
    durationFactor,
    stackFactor,
    extraMoves,
    refSurcharge,
    total: half(raw * stackFactor + refSurcharge),
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
    cost = b.total;
  } else {
    cost = actionCost(action, params);
    lines.push({ label: ACTION_LABEL[action], value: `${formatCredits(cost)} cr` });
  }

  if (!params.prompt.trim() && action === "generate" && !params.references.length) {
    return { cost, unlimited: false, freeTier: false, lines, balanceAfter: null, blocked: { kind: "invalid", message: "Describe your shot or add a reference" } };
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
