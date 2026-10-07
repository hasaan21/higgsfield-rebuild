"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getModel } from "@/lib/catalog/models";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import { refundGeneration } from "@/lib/generate";
import { ACTION_LABEL } from "@/lib/pricing";
import { isActive, useQueue } from "@/lib/stores/queue";
import { selectUser, useSession } from "@/lib/stores/session";

const TICK_MS = 250;

/** Drives the mock engine for the signed-in user. Mounted once in Providers. */
export function EngineTicker() {
  const userId = useSession((s) => s.identity?.id ?? null);
  const hasActive = useQueue((s) => (userId ? s.generations.some((g) => g.userId === userId && isActive(g)) : false));

  useEffect(() => {
    if (!userId || !hasActive) return;
    const step = () => {
      const user = selectUser(useSession.getState());
      if (!user) return;
      const events = useQueue.getState().tick(user.id, PLAN_BY_ID[user.planId], Date.now());
      for (const e of events) {
        const label = e.gen.action === "generate" ? getModel(e.gen.params.modelId).name : ACTION_LABEL[e.gen.action];
        if (e.type === "completed") toast.success(`${label} is ready`, { description: e.gen.params.prompt.slice(0, 80) || undefined });
        if (e.type === "failed") {
          refundGeneration(e.gen, `${label} failed — refund`);
          toast.error(`${label} failed`, { description: e.gen.error });
        }
      }
    };
    step();
    const t = setInterval(step, TICK_MS);
    return () => clearInterval(t);
  }, [userId, hasActive]);

  return null;
}
