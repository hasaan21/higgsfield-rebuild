"use client";

import { useRef, useState } from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { getModel } from "@/lib/catalog/models";
import type { CommunityPost } from "@/lib/types";

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function PostCard({ post, onOpen, onRemix }: { post: CommunityPost; onOpen: () => void; onRemix: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);
  const isVideo = post.media.kind === "video";

  return (
    <div
      className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border/60 bg-card"
      onPointerEnter={() => {
        if (!isVideo) return;
        setArmed(true);
        requestAnimationFrame(() => video.current?.play().catch(() => {}));
      }}
      onPointerLeave={() => video.current?.pause()}
    >
      <button onClick={onOpen} className="relative block w-full" style={{ aspectRatio: `${post.media.width} / ${post.media.height}` }} aria-label={`Open ${post.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.media.poster} alt={post.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
        {isVideo && armed && <video ref={video} src={post.media.src} muted loop playsInline preload="auto" className="absolute inset-0 size-full object-cover" />}
        {isVideo && (
          <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-black/50 text-white/80 transition-opacity group-hover:opacity-0">
            <Play className="size-3 fill-current" />
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-10 text-left opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
          <p className="text-sm font-medium text-white">{post.title}</p>
          <p className="text-[11px] text-white/70">
            @{post.author} · {getModel(post.params.modelId).name}
          </p>
        </div>
      </button>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
        <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white/85">
          <Heart className="size-3" /> {compact(post.likes)}
        </span>
        <button
          onClick={onRemix}
          className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Shuffle className="size-3" /> Remix
        </button>
      </div>
    </div>
  );
}
