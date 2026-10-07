"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canStack } from "@/lib/catalog/camera";
import { defaultModelFor, getModel } from "@/lib/catalog/models";
import { uid } from "@/lib/id";
import { defaultParams, normalizeParams, switchModel } from "@/lib/studio-defaults";
import type { Mode, Reference, ReferenceSlot, StudioParams } from "@/lib/types";

export const SLOT_LIMITS: Record<ReferenceSlot, number> = { first: 1, last: 1, motion: 1, subject: 50 };

export interface RemixInfo {
  postId: string;
  author: string;
  title: string;
}

interface StudioState {
  params: StudioParams;
  lastModelByMode: Record<Mode, string>;
  remix: RemixInfo | null;
  update: (patch: Partial<StudioParams>) => void;
  setFilm: (patch: Partial<StudioParams["film"]>) => void;
  setCamera: (patch: Partial<StudioParams["camera"]>) => void;
  setLook: (patch: Partial<StudioParams["look"]>) => void;
  setMode: (mode: Mode) => void;
  setModel: (modelId: string) => void;
  addMove: (id: string) => { ok: boolean; reason?: string };
  removeMove: (id: string) => void;
  addReference: (ref: Omit<Reference, "id">) => { ok: boolean; reason?: string };
  removeReference: (id: string) => void;
  hydrate: (params: StudioParams, remix?: RemixInfo | null) => void;
  clearRemix: () => void;
  reset: () => void;
  reseed: () => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      params: defaultParams(),
      lastModelByMode: { video: defaultModelFor("video").id, image: defaultModelFor("image").id },
      remix: null,
      update: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
      setFilm: (patch) => set((s) => ({ params: { ...s.params, film: { ...s.params.film, ...patch } } })),
      setCamera: (patch) => set((s) => ({ params: { ...s.params, camera: { ...s.params.camera, ...patch } } })),
      setLook: (patch) => set((s) => ({ params: { ...s.params, look: { ...s.params.look, ...patch } } })),
      setMode: (mode) => {
        const { params, lastModelByMode } = get();
        if (params.mode === mode) return;
        set({
          params: switchModel(params, lastModelByMode[mode]),
          lastModelByMode: { ...lastModelByMode, [params.mode]: params.modelId },
        });
      },
      setModel: (modelId) =>
        set((s) => ({
          params: switchModel(s.params, modelId),
          lastModelByMode: { ...s.lastModelByMode, [getModel(modelId).mode]: modelId },
        })),
      addMove: (id) => {
        const check = canStack(get().params.camera.moves, id);
        if (check.ok) set((s) => ({ params: { ...s.params, camera: { ...s.params.camera, moves: [...s.params.camera.moves, id] } } }));
        return check;
      },
      removeMove: (id) =>
        set((s) => ({ params: { ...s.params, camera: { ...s.params.camera, moves: s.params.camera.moves.filter((m) => m !== id) } } })),
      addReference: (ref) => {
        const { params } = get();
        const model = getModel(params.modelId);
        const inSlot = params.references.filter((r) => r.slot === ref.slot).length;
        if (inSlot >= SLOT_LIMITS[ref.slot]) return { ok: false, reason: `This slot holds ${SLOT_LIMITS[ref.slot]}` };
        if (ref.slot === "subject" && inSlot >= model.maxReferences) return { ok: false, reason: `${model.name} accepts up to ${model.maxReferences} references` };
        if ((ref.slot === "first" || ref.slot === "last") && !model.supports.firstLast) return { ok: false, reason: `${model.name} doesn't support frame locking` };
        if (ref.slot === "motion" && !model.supports.motionRef) return { ok: false, reason: `${model.name} doesn't support motion references` };
        set((s) => ({ params: { ...s.params, references: [...s.params.references, { ...ref, id: uid("ref_") }] } }));
        return { ok: true };
      },
      removeReference: (id) => set((s) => ({ params: { ...s.params, references: s.params.references.filter((r) => r.id !== id) } })),
      hydrate: (params, remix = null) => {
        const next = normalizeParams(params);
        set((s) => ({ params: next, remix, lastModelByMode: { ...s.lastModelByMode, [next.mode]: next.modelId } }));
      },
      clearRemix: () => set({ remix: null }),
      reset: () => set({ params: defaultParams(), remix: null }),
      reseed: () => set((s) => ({ params: { ...s.params, seed: Math.floor(Math.random() * 1_000_000) } })),
    }),
    {
      name: "hf.studio",
      version: 1,
      partialize: (s) => ({ params: s.params, lastModelByMode: s.lastModelByMode, remix: s.remix }),
      merge: (persisted, current) => {
        const p = persisted as Partial<StudioState> | undefined;
        if (!p?.params) return current;
        // Uploaded files are object URLs that die with the tab; keep the slot but flag it.
        const references = p.params.references.map((r) => (r.url.startsWith("blob:") ? { ...r, missing: true } : r));
        return { ...current, ...p, params: normalizeParams({ ...p.params, references }) };
      },
    },
  ),
);
