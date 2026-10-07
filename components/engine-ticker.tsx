"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getModel } from "@/lib/catalog/models";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import type { EngineEvent } from "@/lib/engine";
import { refundGeneration } from "@/lib/generate";
import { refreshProfile, syncGenerations } from "@/lib/live";
import { ACTION_LABEL } from "@/lib/pricing";
import { isActive, useQueue } from "@/lib/stores/queue";
import { selectUser, useSession } from "@/lib/stores/session";

const TICK_MS = 250;
const POLL_MS = 3000;

function announce(events: EngineEvent[], refund: boolean) {
  for (const e of events) {
    const label = e.gen.action === "generate" ? getModel(e.gen.params.modelId).name : ACTION_LABEL[e.gen.action];
    if (e.type === "completed") toast.success(`${label} is ready`, { description: e.gen.params.prompt.slice(0, 80) || undefined });
    if (e.type === "failed") {
      if (refund) refundGeneration(e.gen, `${label} failed — refund`);
      toast.error(`${label} failed`, { description: e.gen.error });
    }
  }
}

/**
 * Demo mode: drives the mock engine for the signed-in user.
 * Live mode: polls the Worker for job changes and animates progress in between. Mounted once in Providers.
 */
export function EngineTicker() {
  const userId = useSession((s) => s.identity?.id ?? null);
  const live = useSession((s) => s.live);
  const hasActive = useQueue((s) => (userId ? s.generations.some((g) => g.userId === userId && isActive(g)) : false));

  useEffect(() => {
    if (!userId || !hasActive) return;

    if (live) {
      let polling = false;
      const animate = setInterval(() => useQueue.getState().tickLive(Date.now()), TICK_MS);
      const poll = setInterval(async () => {
        if (polling) return;
        polling = true;
        try {
          const events = await syncGenerations();
          announce(events, false);
          if (events.some((e) => e.type === "failed")) await refreshProfile();
        } catch {
          // Transient; the next poll retries.
        } finally {
          polling = false;
        }
      }, POLL_MS);
      return () => {
        clearInterval(animate);
        clearInterval(poll);
      };
    }

    const step = () => {
      const user = selectUser(useSession.getState());
      if (!user) return;
      announce(useQueue.getState().tick(user.id, PLAN_BY_ID[user.planId], Date.now()), true);
    };
    step();
    const t = setInterval(step, TICK_MS);
    return () => clearInterval(t);
  }, [userId, hasActive, live]);

  return null;
}
