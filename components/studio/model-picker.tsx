"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Infinity as InfinityIcon, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBackend } from "@/lib/api";
import { durationsFor, getModel, MODELS } from "@/lib/catalog/models";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import { useUser } from "@/lib/hooks";
import { baseCost, canUseModel, formatCredits } from "@/lib/pricing";
import { useStudio } from "@/lib/stores/studio";
import type { ModelSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ModelPicker() {
  const params = useStudio((s) => s.params);
  const setModel = useStudio((s) => s.setModel);
  const user = useUser();
  const [open, setOpen] = useState(false);
  const live = useBackend((s) => s.mode === "live");
  const liveIds = useBackend((s) => s.liveModelIds);
  const current = getModel(params.modelId);
  const models = MODELS.filter((m) => m.mode === params.mode);
  const estimate = (m: ModelSpec) => {
    const resolution = m.resolutions.includes(params.resolution) ? params.resolution : m.resolutions[0];
    const durations = durationsFor(m, resolution);
    return baseCost(m, { ...params, resolution, duration: durations.includes(params.duration) ? params.duration : durations[0] }).total;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 text-sm hover:bg-secondary">
          <span className="truncate font-medium">{current.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-1.5">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">{params.mode === "video" ? "Video models" : "Image models"} · price for current settings</p>
        {models.map((m) => {
          const locked = user ? !canUseModel(m, user.planId) : false;
          const unlimited = user ? m.unlimitedOn.includes(user.planId) : false;
          const est = estimate(m);
          const demo = live && !liveIds.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => {
                setModel(m.id);
                setOpen(false);
              }}
              className={cn("flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-secondary", m.id === current.id && "bg-secondary")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.badge && <span className="rounded bg-primary/15 px-1 text-[9px] font-bold tracking-wider text-primary uppercase">{m.badge}</span>}
                  {demo && (
                    <span
                      className="rounded bg-secondary px-1 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                      title="Not connected to the vendor yet: returns a sample clip, but credits are still charged"
                    >
                      Demo output
                    </span>
                  )}
                  {locked && <Lock className="size-3 text-muted-foreground" />}
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{m.tagline}</p>
                {locked && <p className="text-[11px] text-amber-400/90">Requires {PLAN_BY_ID[m.minPlan].name}</p>}
              </div>
              <div className="shrink-0 text-right">
                {unlimited ? (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <InfinityIcon className="size-3" /> Unlimited
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">{formatCredits(est)} cr</span>
                )}
                {m.id === current.id && <Check className="mt-1 ml-auto size-3.5 text-primary" />}
              </div>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
