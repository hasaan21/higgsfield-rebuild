"use client";

import { Copy, Heart, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CAMERA_BODIES, LENSES, MOVE_BY_ID } from "@/lib/catalog/camera";
import { ERAS, GENRES, LIGHTING, optionName, PALETTES, TEMPOS } from "@/lib/catalog/film";
import { getModel } from "@/lib/catalog/models";
import type { CommunityPost } from "@/lib/types";

export function PostDialog({ post, onClose, onRemix }: { post: CommunityPost | null; onClose: () => void; onRemix: (p: CommunityPost) => void }) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {post && <Body post={post} onRemix={onRemix} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ post, onRemix }: { post: CommunityPost; onRemix: (p: CommunityPost) => void }) {
  const p = post.params;
  const settings: [string, string][] = [
    ["Model", getModel(p.modelId).name],
    ["Genre", optionName(GENRES, p.film.genre)],
    ["Era", optionName(ERAS, p.film.era)],
    ...(p.mode === "video"
      ? ([
          ["Tempo", optionName(TEMPOS, p.film.tempo)],
          ["Camera moves", p.camera.moves.map((m) => MOVE_BY_ID[m]?.name ?? m).join(" + ") || "Auto"],
          ["Duration", `${p.duration}s`],
        ] as [string, string][])
      : []),
    ["Camera", optionName(CAMERA_BODIES, p.camera.body)],
    ["Lens", optionName(LENSES, p.camera.lens)],
    ["Palette", optionName(PALETTES, p.look.palette)],
    ["Lighting", optionName(LIGHTING, p.look.lighting)],
    ["Format", `${p.aspectRatio} · ${p.resolution}`],
  ];

  return (
    <div className="grid max-h-[90dvh] md:grid-cols-[1fr_20rem]">
      <div className="grid min-h-0 place-items-center bg-black">
        {post.media.kind === "video" ? (
          <video key={post.id} src={post.media.src} poster={post.media.poster} autoPlay muted loop playsInline controls className="max-h-[90dvh] w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.media.src} alt={post.title} className="max-h-[90dvh] w-full object-contain" />
        )}
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto p-5">
        <DialogTitle className="text-lg">{post.title}</DialogTitle>
        <DialogDescription className="mt-0.5">
          by @{post.author} · <Heart className="inline size-3" /> {post.likes.toLocaleString()} · {post.remixes} remixes
        </DialogDescription>
        <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Prompt</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(p.prompt);
                toast("Prompt copied");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Copy prompt"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">{p.prompt}</p>
        </div>
        <dl className="mt-4 space-y-1.5 text-xs">
          {settings.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto pt-5">
          <Button className="w-full" size="lg" onClick={() => onRemix(post)}>
            <Shuffle /> Remix in Studio
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Loads every setting above. Change anything, then generate.</p>
        </div>
      </div>
    </div>
  );
}
