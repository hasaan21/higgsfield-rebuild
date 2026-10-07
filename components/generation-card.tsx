"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Heart, Loader2, RotateCcw, Shuffle } from "lucide-react";
import { getModel } from "@/lib/catalog/models";
import { startGeneration, toggleFavorite } from "@/lib/generate";
import { timeAgo } from "@/lib/id";
import { ACTION_LABEL } from "@/lib/pricing";
import { useQueue } from "@/lib/stores/queue";
import type { AspectRatio, Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "21:9": "aspect-[21/9]",
};

interface Props {
  gen: Generation;
  position?: number;
  actions?: React.ReactNode;
  onOpen?: () => void;
  className?: string;
}

export function GenerationCard({ gen, position, actions, onOpen, className }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const model = getModel(gen.params.modelId);
  const title = gen.action === "generate" ? model.name : `${ACTION_LABEL[gen.action]} · ${model.name}`;

  const retry = () => {
    const parent = gen.parentId ? useQueue.getState().generations.find((g) => g.id === gen.parentId) : undefined;
    startGeneration(gen.params, { action: gen.action, parent, remixOf: gen.remixOf });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("group relative overflow-hidden rounded-xl border border-border bg-card", className)}
      onMouseEnter={() => video.current?.play().catch(() => {})}
      onMouseLeave={() => {
        if (video.current) {
          video.current.pause();
          video.current.currentTime = 0;
        }
      }}
    >
      <div className={cn("relative w-full overflow-hidden bg-black", ASPECT_CLASS[gen.params.aspectRatio])}>
        {gen.status === "completed" && gen.output ? (
          <button className="block size-full" onClick={onOpen} aria-label="Open">
            {gen.output.kind === "video" ? (
              <video ref={video} src={gen.output.src} poster={gen.output.poster || undefined} muted loop playsInline preload={gen.output.poster ? "none" : "metadata"} className="size-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gen.output.src} alt={gen.params.prompt} className="size-full object-cover" />
            )}
          </button>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary">
            <div className="absolute inset-0 bg-grain" />
            {(gen.status === "processing" || gen.status === "queued") && <div className="absolute inset-0 shimmer" />}
          </div>
        )}

        {gen.status === "processing" && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-3xl font-semibold tabular-nums">{gen.progress}%</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Rendering
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
              <motion.div className="h-full bg-primary" animate={{ width: `${gen.progress}%` }} transition={{ ease: "linear", duration: 0.25 }} />
            </div>
          </div>
        )}
        {gen.status === "queued" && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-sm font-medium">Queued{position ? ` · #${position}` : ""}</p>
              <p className="text-xs text-muted-foreground">Waiting for a free slot</p>
            </div>
          </div>
        )}
        {gen.status === "failed" && (
          <div className="absolute inset-0 grid place-items-center bg-destructive/10 p-4 text-center">
            <div>
              <AlertTriangle className="mx-auto size-5 text-destructive" />
              <p className="mt-2 text-xs text-muted-foreground">{gen.error}</p>
              <button onClick={retry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs hover:bg-accent">
                <RotateCcw className="size-3" /> Retry
              </button>
            </div>
          </div>
        )}
        {gen.status === "cancelled" && <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Cancelled</div>}

        {gen.watermark && gen.status === "completed" && (
          <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white/70 uppercase">
            Higgsfield · Free
          </span>
        )}
        {gen.remixOf && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80">
            <Shuffle className="size-3" /> Remix
          </span>
        )}
        {gen.status === "completed" && (
          <button
            onClick={() => toggleFavorite(gen.id)}
            className={cn(
              "absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 transition-opacity",
              gen.favorite ? "text-rose-400 opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            aria-label={gen.favorite ? "Unfavourite" : "Favourite"}
          >
            <Heart className={cn("size-3.5", gen.favorite && "fill-current")} />
          </button>
        )}
      </div>
      <div className="flex items-start gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {gen.params.prompt || "Untitled"} · {timeAgo(gen.createdAt)}
          </p>
        </div>
        {actions}
      </div>
    </motion.div>
  );
}
