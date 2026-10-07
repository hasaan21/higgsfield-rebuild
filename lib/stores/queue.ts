"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { advance, durationMsFor, type EngineEvent } from "@/lib/engine";
import { uid } from "@/lib/id";
import type { Generation, GenerationAction, Plan, StudioParams } from "@/lib/types";

export interface SubmitInput {
  userId: string;
  params: StudioParams;
  action: GenerationAction;
  cost: number;
  unlimited: boolean;
  freeTier: boolean;
  watermark: boolean;
  parentId?: string;
  remixOf?: string;
}

interface QueueState {
  generations: Generation[];
  submit: (input: SubmitInput) => Generation;
  cancel: (id: string) => Generation | null;
  toggleFavorite: (id: string) => void;
  remove: (id: string) => void;
  tick: (userId: string, plan: Plan, now: number) => EngineEvent[];
  markRefunded: (id: string) => void;
}

export const useQueue = create<QueueState>()(
  persist(
    (set, get) => ({
      generations: [],
      submit: (input) => {
        const gen: Generation = {
          id: uid("gen_"),
          userId: input.userId,
          action: input.action,
          parentId: input.parentId,
          params: structuredClone(input.params),
          status: "queued",
          progress: 0,
          cost: input.cost,
          freeTier: input.freeTier,
          unlimited: input.unlimited,
          refunded: false,
          createdAt: Date.now(),
          durationMs: durationMsFor(input.params, input.action),
          favorite: false,
          remixOf: input.remixOf,
          watermark: input.watermark,
        };
        set((s) => ({ generations: [gen, ...s.generations] }));
        return gen;
      },
      cancel: (id) => {
        const gen = get().generations.find((g) => g.id === id);
        if (!gen || (gen.status !== "queued" && gen.status !== "processing")) return null;
        const cancelled: Generation = { ...gen, status: "cancelled", finishedAt: Date.now() };
        set((s) => ({ generations: s.generations.map((g) => (g.id === id ? cancelled : g)) }));
        return gen;
      },
      toggleFavorite: (id) => set((s) => ({ generations: s.generations.map((g) => (g.id === id ? { ...g, favorite: !g.favorite } : g)) })),
      remove: (id) => set((s) => ({ generations: s.generations.filter((g) => g.id !== id) })),
      markRefunded: (id) => set((s) => ({ generations: s.generations.map((g) => (g.id === id ? { ...g, refunded: true } : g)) })),
      tick: (userId, plan, now) => {
        const { next, events } = advance(get().generations, userId, plan, now);
        if (next !== get().generations && next.some((g, i) => g !== get().generations[i])) set({ generations: next });
        return events;
      },
    }),
    { name: "hf.queue", version: 1, partialize: (s) => ({ generations: s.generations.slice(0, 300) }) },
  ),
);

export const isActive = (g: Generation) => g.status === "queued" || g.status === "processing";
