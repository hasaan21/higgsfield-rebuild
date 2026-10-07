"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import type { Character, SoulCastParams } from "@/lib/types";

interface LibraryState {
  characters: Character[];
  trainSoulId: (input: { userId: string; name: string; photoCount: number; thumbnail: string }) => Character;
  castActor: (input: { userId: string; name: string; cast: SoulCastParams; thumbnail: string }) => Character;
  removeCharacter: (id: string) => void;
}

/** Soul ID training takes ~3–5 min on Higgsfield; compressed so the demo stays watchable. */
export const SOUL_ID_TRAIN_MS = 25_000;
export const SOUL_CAST_MS = 6_000;

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      characters: [],
      trainSoulId: ({ userId, name, photoCount, thumbnail }) => {
        const c: Character = { id: uid("chr_"), userId, name, kind: "soul-id", status: "training", progress: 0, createdAt: Date.now(), trainMs: SOUL_ID_TRAIN_MS, thumbnail, photoCount };
        set((s) => ({ characters: [c, ...s.characters] }));
        return c;
      },
      castActor: ({ userId, name, cast, thumbnail }) => {
        const c: Character = { id: uid("chr_"), userId, name, kind: "soul-cast", status: "training", progress: 0, createdAt: Date.now(), trainMs: SOUL_CAST_MS, thumbnail, cast };
        set((s) => ({ characters: [c, ...s.characters] }));
        return c;
      },
      removeCharacter: (id) => set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),
    }),
    { name: "hf.library", version: 1 },
  ),
);

/** Training state is derived from time, like generations, so it survives reloads without a ticker. */
export function characterState(c: Character, now: number): { status: Character["status"]; progress: number } {
  if (c.status !== "training") return { status: c.status, progress: c.progress };
  const t = (now - c.createdAt) / c.trainMs;
  return t >= 1 ? { status: "ready", progress: 100 } : { status: "training", progress: Math.floor(t * 100) };
}
