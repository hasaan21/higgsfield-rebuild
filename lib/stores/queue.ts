"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { advance, durationMsFor, easedProgress, type EngineEvent } from "@/lib/engine";
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
  /** Live mode: the Worker runs jobs and this list is a cache of the server's. */
  live: boolean;
  submit: (input: SubmitInput) => Generation;
  cancel: (id: string) => Generation | null;
  toggleFavorite: (id: string) => void;
  remove: (id: string) => void;
  tick: (userId: string, plan: Plan, now: number) => EngineEvent[];
  markRefunded: (id: string) => void;
  /** Insert or replace server rows; `full` drops local rows the server no longer has. Returns status transitions. */
  mergeServer: (rows: Generation[], deleted: string[], full?: boolean) => EngineEvent[];
  /** Cosmetic progress for live jobs, from elapsed time against the expected duration. */
  tickLive: (now: number) => void;
  replace: (id: string, gen: Generation | null) => void;
}

/** Live progress never claims to be done before the server says so. */
const LIVE_PROGRESS_CAP = 95;

export const useQueue = create<QueueState>()(
  persist(
    (set, get) => ({
      generations: [],
      live: false,
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
      mergeServer: (rows, deleted, full = false) => {
        const events: EngineEvent[] = [];
        const current = get().generations;
        const byId = new Map(current.map((g) => [g.id, g]));
        const incoming = new Set(rows.map((r) => r.id));
        const gone = new Set(deleted);

        for (const row of rows) {
          const prev = byId.get(row.id);
          const merged: Generation = row.status === "processing" ? { ...row, progress: prev?.progress ?? 0 } : row;
          byId.set(row.id, merged);
          if (prev && prev.status !== row.status) {
            if (row.status === "processing") events.push({ type: "started", gen: merged });
            if (row.status === "completed") events.push({ type: "completed", gen: merged });
            if (row.status === "failed") events.push({ type: "failed", gen: merged });
          }
        }
        for (const id of gone) byId.delete(id);
        if (full) for (const g of current) if (!incoming.has(g.id) && !pending.has(g.id)) byId.delete(g.id);

        set({ generations: [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 300) });
        return events;
      },
      tickLive: (now) => {
        let changed = false;
        const next = get().generations.map((g) => {
          if (g.status !== "processing" || !g.startedAt) return g;
          const progress = Math.min(LIVE_PROGRESS_CAP, easedProgress((now - g.startedAt) / g.durationMs));
          if (progress === g.progress) return g;
          changed = true;
          return { ...g, progress };
        });
        if (changed) set({ generations: next });
      },
      replace: (id, gen) =>
        set((s) => ({ generations: gen ? s.generations.map((g) => (g.id === id ? gen : g)) : s.generations.filter((g) => g.id !== id) })),
    }),
    { name: "hf.queue", version: 1, partialize: (s) => ({ generations: s.generations.slice(0, 300) }) },
  ),
);

/** Ids submitted optimistically whose POST hasn't returned yet; a full sync must not drop them. */
export const pending = new Set<string>();

/** Live jobs are cached under their own key so they never mix with demo history. */
let switching: Promise<void> | null = null;
export function switchQueueToServer() {
  switching ??= (async () => {
    const key = "hf.queue.live";
    useQueue.persist.setOptions({ name: key });
    if (localStorage.getItem(key)) await useQueue.persist.rehydrate();
    else useQueue.setState({ generations: [] });
    useQueue.setState({ live: true });
  })();
  return switching;
}

export const isActive = (g: Generation) => g.status === "queued" || g.status === "processing";
