"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Infinity as InfinityIcon, ListVideo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModel } from "@/lib/catalog/models";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import { etaSeconds, queuePositions } from "@/lib/engine";
import { cancelGeneration } from "@/lib/generate";
import { useUser } from "@/lib/hooks";
import { timeAgo } from "@/lib/id";
import { ACTION_LABEL, formatCredits } from "@/lib/pricing";
import { isActive, useQueue } from "@/lib/stores/queue";
import type { Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function useMyGenerations() {
  const user = useUser();
  const all = useQueue((s) => s.generations);
  return useMemo(() => (user ? all.filter((g) => g.userId === user.id) : []), [all, user]);
}

export function QueuePanelBody() {
  const user = useUser();
  const mine = useMyGenerations();
  const active = mine.filter(isActive);
  const recent = mine.filter((g) => !isActive(g)).slice(0, 8);
  const now = useNow(active.length > 0);
  const positions = queuePositions(mine);
  if (!user) return null;
  const plan = PLAN_BY_ID[user.planId];
  const creditBusy = active.filter((g) => g.status === "processing" && !g.unlimited).length;
  const unlimitedBusy = active.filter((g) => g.status === "processing" && g.unlimited).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Parallel slots · {plan.name}</span>
          <span className="tabular-nums text-foreground">
            {creditBusy}/{plan.concurrency}
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: plan.concurrency }).map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < creditBusy ? "bg-primary" : "bg-border")} />
          ))}
        </div>
        {plan.id !== "free" && plan.id !== "basic" && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <InfinityIcon className="size-3" /> Unlimited lane: {unlimitedBusy ? "busy" : "free"} — 1 job per format at a time
          </p>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">In progress</h3>
        {active.length === 0 && <p className="text-sm text-muted-foreground">Nothing rendering. Hit Generate to start a shot.</p>}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {active.map((g) => (
              <motion.div key={g.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}>
                <ActiveJob gen={g} position={positions.get(g.id)} eta={etaSeconds(g, now)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section className="min-h-0 flex-1">
        <h3 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Recent</h3>
        <div className="space-y-1.5">
          {recent.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-xs">
              <StatusDot status={g.status} />
              <span className="min-w-0 flex-1 truncate">{label(g)}</span>
              <span className={cn("shrink-0 tabular-nums", g.refunded ? "text-primary" : "text-muted-foreground")}>
                {costLabel(g)}
              </span>
              <span className="w-12 shrink-0 text-right text-muted-foreground">{timeAgo(g.finishedAt ?? g.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActiveJob({ gen, position, eta }: { gen: Generation; position?: number; eta: number | null }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label(gen)}</p>
          <p className="truncate text-xs text-muted-foreground">{gen.params.prompt || "Untitled shot"}</p>
        </div>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={() => cancelGeneration(gen.id)}
          aria-label="Cancel generation"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {gen.status === "queued" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Queued · position {position ?? "–"} · waiting for a free slot
        </p>
      ) : (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <motion.div className="h-full bg-primary" animate={{ width: `${gen.progress}%` }} transition={{ ease: "linear", duration: 0.25 }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{gen.progress}%</span>
            <span>{eta !== null ? `~${eta}s left` : ""}</span>
          </div>
        </>
      )}
      <span className="mt-1 block text-[11px] text-muted-foreground">{costLabel(gen)}</span>
    </div>
  );
}

function StatusDot({ status }: { status: Generation["status"] }) {
  const color = { completed: "bg-primary", failed: "bg-destructive", cancelled: "bg-muted-foreground", queued: "bg-amber-400", processing: "bg-sky-400" }[status];
  return <span className={cn("size-1.5 shrink-0 rounded-full", color)} />;
}

function label(g: Generation) {
  return g.action === "generate" ? getModel(g.params.modelId).name : ACTION_LABEL[g.action];
}

function costLabel(g: Generation) {
  if (g.unlimited) return "Unlimited";
  if (g.freeTier) return g.refunded ? "Free gen returned" : "Free gen";
  if (g.refunded) return `+${formatCredits(g.cost)} refunded`;
  return `${formatCredits(g.cost)} cr`;
}

export function QueuePanel() {
  const mine = useMyGenerations();
  const activeCount = mine.filter(isActive).length;

  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-80 shrink-0 overflow-y-auto border-l border-border/60 p-4 xl:block">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <ListVideo className="size-4 text-primary" /> Generation queue
        </h2>
        <QueuePanelBody />
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button size="sm" variant="secondary" className="fixed right-4 bottom-4 z-30 gap-2 shadow-lg xl:hidden">
            <ListVideo className="size-4" /> Queue
            {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{activeCount}</span>}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[22rem] p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Generation queue</SheetTitle>
          </SheetHeader>
          <QueuePanelBody />
        </SheetContent>
      </Sheet>
    </>
  );
}
