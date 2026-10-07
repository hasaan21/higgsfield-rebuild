"use client";

import { ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { downloadWithProvenance, GenerationActions } from "@/components/library/generation-actions";
import { MOVE_BY_ID } from "@/lib/catalog/camera";
import { GENRES, optionName, PALETTES } from "@/lib/catalog/film";
import { getModel } from "@/lib/catalog/models";
import { timeAgo } from "@/lib/id";
import { ACTION_LABEL, formatCredits } from "@/lib/pricing";
import type { Generation } from "@/lib/types";

interface Props {
  gen: Generation | null;
  all: Generation[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function GenerationDialog({ gen, all, onClose, onSelect }: Props) {
  return (
    <Dialog open={!!gen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">{gen && <Body gen={gen} all={all} onSelect={onSelect} />}</DialogContent>
    </Dialog>
  );
}

function Body({ gen, all, onSelect }: { gen: Generation; all: Generation[]; onSelect: (id: string) => void }) {
  const p = gen.params;
  const lineage: Generation[] = [];
  for (let cur = gen.parentId ? all.find((g) => g.id === gen.parentId) : undefined; cur; cur = cur.parentId ? all.find((g) => g.id === cur!.parentId) : undefined) {
    lineage.unshift(cur);
  }
  const children = all.filter((g) => g.parentId === gen.id);
  const cost = gen.unlimited ? "Unlimited" : gen.freeTier ? "Free generation" : `${formatCredits(gen.cost)} cr${gen.refunded ? " (refunded)" : ""}`;

  const rows: [string, string][] = [
    ["Model", getModel(p.modelId).name],
    ["Action", ACTION_LABEL[gen.action]],
    ["Genre", optionName(GENRES, p.film.genre)],
    ...(p.mode === "video" ? ([["Moves", p.camera.moves.map((m) => MOVE_BY_ID[m]?.name ?? m).join(" + ") || "Auto"]] as [string, string][]) : []),
    ["Palette", optionName(PALETTES, p.look.palette)],
    ["Format", `${p.aspectRatio} · ${p.mode === "video" ? `${p.duration}s · ` : ""}${p.resolution}`],
    ["Seed", String(p.seed)],
    ["Cost", cost],
  ];

  return (
    <div className="grid max-h-[90dvh] md:grid-cols-[1fr_20rem]">
      <div className="grid min-h-0 place-items-center bg-black">
        {gen.output?.kind === "video" ? (
          <video key={gen.id} src={gen.output.src} poster={gen.output.poster} autoPlay muted loop playsInline controls className="max-h-[90dvh] w-full object-contain" />
        ) : gen.output ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gen.output.src} alt={p.prompt} className="max-h-[90dvh] w-full object-contain" />
        ) : (
          <p className="p-16 text-sm text-muted-foreground">{gen.status === "failed" ? gen.error : "Still rendering…"}</p>
        )}
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <DialogTitle className="text-base">{p.prompt || "Untitled"}</DialogTitle>
            <DialogDescription className="mt-0.5">{timeAgo(gen.createdAt)}</DialogDescription>
          </div>
          <GenerationActions gen={gen} />
        </div>
        <dl className="mt-4 space-y-1.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {(lineage.length > 0 || children.length > 0) && (
          <div className="mt-5">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Lineage</p>
            <div className="mt-2 space-y-1">
              {[...lineage, gen, ...children].map((g) => (
                <button
                  key={g.id}
                  disabled={g.id === gen.id}
                  onClick={() => onSelect(g.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary disabled:bg-secondary/60"
                >
                  <span>
                    {ACTION_LABEL[g.action]}
                    {g.id === gen.id && <span className="ml-1 text-muted-foreground">(this)</span>}
                  </span>
                  {g.id !== gen.id && <ArrowUpRight className="size-3 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {gen.output && (
          <div className="mt-auto pt-5">
            <Button variant="secondary" className="w-full" onClick={() => downloadWithProvenance(gen)}>
              <Download /> Download with provenance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
