"use client";

import { useRouter } from "next/navigation";
import { Crop, Download, Expand, Mic, MoreHorizontal, RefreshCcw, Timer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getModel } from "@/lib/catalog/models";
import { cancelGeneration, deleteGeneration, startGeneration } from "@/lib/generate";
import { actionCost, formatCredits } from "@/lib/pricing";
import { isActive } from "@/lib/stores/queue";
import { useStudio } from "@/lib/stores/studio";
import type { AspectRatio, Generation, GenerationAction, StudioParams } from "@/lib/types";

const REFRAME_TARGETS: AspectRatio[] = ["16:9", "9:16", "1:1", "4:5", "21:9"];

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadWithProvenance(gen: Generation) {
  if (!gen.output) return;
  const ext = (gen.output.key ?? new URL(gen.output.src, location.href).pathname).split(".").pop();
  const base = `higgsfield-${gen.id}`;
  download(gen.output.src, `${base}.${ext}`);
  const provenance = {
    id: gen.id,
    createdAt: new Date(gen.createdAt).toISOString(),
    action: gen.action,
    parentId: gen.parentId ?? null,
    remixOf: gen.remixOf ?? null,
    model: getModel(gen.params.modelId).name,
    params: { ...gen.params, references: gen.params.references.map((r) => ({ slot: r.slot, name: r.name })) },
    cost: gen.cost,
    unlimited: gen.unlimited,
    watermark: gen.watermark,
    note: gen.provider && gen.provider !== "mock" ? `Rendered by ${getModel(gen.params.modelId).name}.` : "Mock output from the Higgsfield rebuild demo engine.",
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(provenance, null, 2)], { type: "application/json" }));
  download(url, `${base}.provenance.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Downloaded", { description: "Media plus a provenance JSON with the exact settings." });
}

export function GenerationActions({ gen, align = "end" }: { gen: Generation; align?: "start" | "end" }) {
  const router = useRouter();
  const isVideo = gen.params.mode === "video";
  const done = gen.status === "completed";
  const model = getModel(gen.params.modelId);

  const run = (action: GenerationAction, params: StudioParams = gen.params) => startGeneration(params, { action, parent: gen, remixOf: gen.remixOf });

  const reuse = () => {
    useStudio.getState().hydrate(gen.params, null);
    router.push("/studio/");
    toast("Settings loaded into Studio");
  };

  const extendParams: StudioParams = { ...gen.params, duration: gen.params.duration + 5 };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Actions">
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        {done && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Quick actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => run("upscale", { ...gen.params, resolution: "4k" })}>
              <Expand /> Upscale to 4K <Cost n={actionCost("upscale", gen.params)} />
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Crop /> Reframe
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {REFRAME_TARGETS.filter((a) => a !== gen.params.aspectRatio).map((a) => (
                  <DropdownMenuItem key={a} onClick={() => run("reframe", { ...gen.params, aspectRatio: a })}>
                    {a} <Cost n={actionCost("reframe", gen.params)} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {isVideo && (
              <>
                <DropdownMenuItem onClick={() => run("extend", extendParams)}>
                  <Timer /> Extend +5s <Cost n={actionCost("extend", gen.params)} />
                </DropdownMenuItem>
                {model.supports.audio && (
                  <DropdownMenuItem onClick={() => run("lipsync")}>
                    <Mic /> Lip Sync <Cost n={actionCost("lipsync", gen.params)} />
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => downloadWithProvenance(gen)}>
              <Download /> Download + provenance
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={reuse}>
          <RefreshCcw /> Reuse settings
        </DropdownMenuItem>
        {isActive(gen) ? (
          <DropdownMenuItem onClick={() => cancelGeneration(gen.id)}>
            <X /> Cancel
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={() => deleteGeneration(gen.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Cost({ n }: { n: number }) {
  return <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatCredits(n)} cr</span>;
}
