"use client";

import { toast } from "sonner";
import { getModel } from "@/lib/catalog/models";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import { cancelLive, deleteLive, favoriteLive, submitLive } from "@/lib/live";
import { ACTION_LABEL, formatCredits, quote } from "@/lib/pricing";
import { usePaywall } from "@/lib/stores/paywall";
import { useQueue } from "@/lib/stores/queue";
import { selectUser, useSession } from "@/lib/stores/session";
import type { Generation, GenerationAction, StudioParams } from "@/lib/types";

interface Options {
  action?: GenerationAction;
  parent?: Generation;
  remixOf?: string;
}

/** Quote, charge and enqueue. Opens the paywall instead when the quote is blocked. */
export function startGeneration(params: StudioParams, opts: Options = {}): Generation | null {
  const action = opts.action ?? "generate";
  const session = useSession.getState();
  const user = selectUser(session);
  const q = quote(params, user, action);

  if (q.blocked) {
    if (q.blocked.kind === "invalid") toast.error(q.blocked.message);
    else usePaywall.getState().open(q.blocked);
    return null;
  }
  if (!user) return null;

  const label = action === "generate" ? getModel(params.modelId).name : ACTION_LABEL[action];
  const live = useSession.getState().live;

  const gen = useQueue.getState().submit({
    userId: user.id,
    params,
    action,
    cost: q.cost,
    unlimited: q.unlimited,
    freeTier: q.freeTier,
    watermark: PLAN_BY_ID[user.planId].watermark,
    parentId: opts.parent?.id,
    remixOf: opts.remixOf,
  });

  if (live) {
    void submitLive(gen, action, params, opts.parent?.id, opts.remixOf).then((saved) => {
      if (!saved) return;
      toast(`${label} queued`, {
        description: saved.unlimited ? "Unlimited — no credits charged" : saved.freeTier ? "Using a free generation" : `${formatCredits(saved.cost)} credits charged`,
      });
    });
    return gen;
  }

  if (q.freeTier) session.consumeFreeGeneration();
  else if (q.cost > 0) session.debit(q.cost, `${label}${action === "generate" ? ` · ${params.duration ? `${params.duration}s ` : ""}${params.resolution}` : ""}`, gen.id);

  toast(`${label} queued`, {
    description: q.unlimited ? "Unlimited — no credits charged" : q.freeTier ? "Using a free generation" : `${formatCredits(q.cost)} credits charged`,
  });
  return gen;
}

/** Refund a job that never produced output. Higgsfield doesn't refund; we do for failures and queued cancels. */
export function refundGeneration(gen: Generation, reason: string) {
  if (gen.refunded || useSession.getState().live) return;
  const session = useSession.getState();
  if (gen.freeTier) session.restoreFreeGeneration();
  else if (gen.cost > 0) session.refund(gen.cost, reason, gen.id);
  useQueue.getState().markRefunded(gen.id);
}

export function toggleFavorite(id: string) {
  if (useSession.getState().live) return void favoriteLive(id);
  useQueue.getState().toggleFavorite(id);
}

export function deleteGeneration(id: string) {
  if (useSession.getState().live) return void deleteLive(id);
  useQueue.getState().remove(id);
}

export function cancelGeneration(id: string) {
  if (useSession.getState().live) return void cancelLive(id);
  const prev = useQueue.getState().cancel(id);
  if (!prev) return;
  if (prev.status === "queued") {
    refundGeneration(prev, "Cancelled before start — refund");
    toast("Cancelled", { description: "Refunded — it hadn't started yet." });
  } else {
    toast("Cancelled", { description: "Already rendering, so no refund." });
  }
}
