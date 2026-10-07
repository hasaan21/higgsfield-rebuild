"use client";

import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useNow } from "@/lib/hooks";
import { characterState, useLibrary } from "@/lib/stores/library";
import { useStudio } from "@/lib/stores/studio";
import type { Character } from "@/lib/types";

export function CharacterGrid({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const remove = useLibrary((s) => s.removeCharacter);
  const now = useNow((t) => characters.some((c) => characterState(c, t).status === "training"));

  if (characters.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-14 text-center">
        <UserRound className="size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No characters yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Train a Soul ID from your photos, or cast a brand-new actor. Either one locks a face across every shot.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {characters.map((c) => {
        const st = characterState(c, now);
        const ready = st.status === "ready";
        return (
          <div key={c.id} className="group overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-square bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumbnail} alt={c.name} className="size-full object-cover" style={{ filter: ready ? undefined : "grayscale(1) blur(2px)" }} />
              {!ready && (
                <div className="absolute inset-0 grid place-items-center bg-black/50">
                  <div className="w-3/4 text-center">
                    <Loader2 className="mx-auto size-4 animate-spin" />
                    <p className="mt-1 text-xs">{c.kind === "soul-id" ? "Training" : "Casting"} · {st.progress}%</p>
                    <Progress value={st.progress} className="mt-2 h-1" />
                  </div>
                </div>
              )}
              <button
                onClick={() => remove(c.id)}
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="p-2.5">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.kind === "soul-id" ? `Soul ID · ${c.photoCount} photos` : `Soul Cast · ${c.cast?.archetype}`}
              </p>
              <button
                disabled={!ready}
                onClick={() => {
                  useStudio.getState().update({ characterId: c.id });
                  toast(`${c.name} locked in Studio`);
                  router.push("/studio/");
                }}
                className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-secondary text-xs hover:bg-accent disabled:opacity-40"
              >
                <Clapperboard className="size-3" /> Use in Studio
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
