"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus, UserRound } from "lucide-react";
import { EMOTIONS } from "@/lib/catalog/film";
import { useNow, useUser } from "@/lib/hooks";
import { characterState, useLibrary } from "@/lib/stores/library";
import { useStudio } from "@/lib/stores/studio";
import { cn } from "@/lib/utils";

export function CharacterPicker() {
  const user = useUser();
  const all = useLibrary((s) => s.characters);
  const characterId = useStudio((s) => s.params.characterId);
  const emotion = useStudio((s) => s.params.emotion);
  const update = useStudio((s) => s.update);
  const characters = useMemo(() => all.filter((c) => c.userId === user?.id), [all, user?.id]);
  const now = useNow((t) => characters.some((c) => characterState(c, t).status === "training"));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => update({ characterId: null, emotion: null })}
          className={cn("flex w-16 shrink-0 flex-col items-center gap-1 text-[11px]", !characterId ? "text-foreground" : "text-muted-foreground")}
        >
          <span className={cn("grid size-14 place-items-center rounded-full border", !characterId ? "border-primary" : "border-border")}>
            <UserRound className="size-5" />
          </span>
          None
        </button>
        {characters.map((c) => {
          const st = characterState(c, now);
          const ready = st.status === "ready";
          return (
            <button
              key={c.id}
              disabled={!ready}
              onClick={() => update({ characterId: c.id })}
              className={cn("flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] disabled:opacity-50", characterId === c.id ? "text-foreground" : "text-muted-foreground")}
              title={ready ? c.name : `Training ${st.progress}%`}
            >
              <span className={cn("relative size-14 overflow-hidden rounded-full border-2", characterId === c.id ? "border-primary" : "border-transparent")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.thumbnail} alt="" className="size-full object-cover" />
                {!ready && <span className="absolute inset-0 grid place-items-center bg-black/60 text-[10px]">{st.progress}%</span>}
              </span>
              <span className="w-full truncate">{c.name}</span>
            </button>
          );
        })}
        <Link href="/characters/" className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <span className="grid size-14 place-items-center rounded-full border border-dashed border-border">
            <Plus className="size-5" />
          </span>
          New
        </Link>
      </div>

      <div className={cn(!characterId && "pointer-events-none opacity-40")}>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Emotion wheel</p>
        <div className="relative mx-auto size-44">
          <div className="absolute inset-[30%] grid place-items-center rounded-full border border-border text-center text-[11px] text-muted-foreground">
            {emotion ? EMOTIONS.find((e) => e.id === emotion)?.name : "Neutral"}
          </div>
          {EMOTIONS.map((e, i) => {
            const angle = (i / EMOTIONS.length) * Math.PI * 2 - Math.PI / 2;
            const active = emotion === e.id;
            return (
              <button
                key={e.id}
                onClick={() => update({ emotion: active ? null : e.id })}
                className={cn(
                  "absolute flex h-6 -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 text-[10px] transition-all",
                  active ? "scale-110 border-transparent text-black" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
                style={{ left: `${50 + Math.cos(angle) * 42}%`, top: `${50 + Math.sin(angle) * 42}%`, background: active ? e.swatch : undefined }}
              >
                {!active && <span className="size-1.5 rounded-full" style={{ background: e.swatch }} />}
                {e.name}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Applied as @character Emotion in the prompt</p>
      </div>
    </div>
  );
}
