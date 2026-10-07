"use client";

import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { usePaywall } from "@/lib/stores/paywall";
import { pending, useQueue } from "@/lib/stores/queue";
import { useSession, type ServerProfile } from "@/lib/stores/session";
import type { EngineEvent } from "@/lib/engine";
import type { Generation, GenerationAction, PlanId, StudioParams } from "@/lib/types";

/** Server calls for live mode. The stores stay the single source the UI reads from. */

let cursor: string | null = null;

export async function refreshProfile() {
  const { profile } = await api<{ profile: ServerProfile }>("/api/me");
  useSession.getState().setServerProfile(profile);
  return profile;
}

/** Pulls changes since the last sync (or everything when `full`). */
export async function syncGenerations(full = false): Promise<EngineEvent[]> {
  const q = !full && cursor ? `?since=${encodeURIComponent(cursor)}` : "";
  const res = await api<{ generations: Generation[]; deleted: string[]; cursor: string | null }>(`/api/generations${q}`);
  if (res.cursor) cursor = res.cursor;
  return useQueue.getState().mergeServer(res.generations, res.deleted, full);
}

export function resetSync() {
  cursor = null;
}

function showApiError(err: unknown) {
  if (err instanceof ApiRequestError && err.status === 402) {
    if (err.code === "plan") usePaywall.getState().open({ kind: "plan", message: err.message, requiredPlan: err.data.requiredPlan as PlanId });
    else usePaywall.getState().open({ kind: "credits", message: err.message, shortBy: Number(err.data.shortBy) || 0 });
    return;
  }
  toast.error(err instanceof Error ? err.message : "Something went wrong");
}

/** The optimistic row is already in the queue; this swaps it for the server's or removes it on rejection. */
export async function submitLive(optimistic: Generation, action: GenerationAction, params: StudioParams, parentId?: string, remixOf?: string) {
  pending.add(optimistic.id);
  try {
    const res = await api<{ generation: Generation; profile: ServerProfile }>("/api/generations", {
      json: { id: optimistic.id, params, action, parentId, remixOf },
    });
    useQueue.getState().replace(optimistic.id, res.generation);
    useSession.getState().setServerProfile(res.profile);
    return res.generation;
  } catch (err) {
    useQueue.getState().replace(optimistic.id, null);
    showApiError(err);
    return null;
  } finally {
    pending.delete(optimistic.id);
  }
}

export async function cancelLive(id: string) {
  try {
    const res = await api<{ previous: string; profile: ServerProfile }>(`/api/generations/${id}/cancel`, { method: "POST" });
    useQueue.getState().cancel(id);
    useSession.getState().setServerProfile(res.profile);
    if (res.previous === "queued") toast("Cancelled", { description: "Refunded — it hadn't started yet." });
    else if (res.previous === "processing") toast("Cancelled", { description: "Already rendering, so no refund." });
  } catch (err) {
    showApiError(err);
  }
}

export async function favoriteLive(id: string) {
  const gen = useQueue.getState().generations.find((g) => g.id === id);
  if (!gen) return;
  useQueue.getState().toggleFavorite(id);
  try {
    await api(`/api/generations/${id}`, { method: "PATCH", json: { favorite: !gen.favorite } });
  } catch (err) {
    useQueue.getState().toggleFavorite(id);
    showApiError(err);
  }
}

export async function deleteLive(id: string) {
  const gen = useQueue.getState().generations.find((g) => g.id === id);
  useQueue.getState().remove(id);
  try {
    await api(`/api/generations/${id}`, { method: "DELETE" });
  } catch (err) {
    if (gen) useQueue.getState().mergeServer([gen], []);
    showApiError(err);
  }
}

/** Stores a reference in R2 so vendors can use it; returns the storage key and a signed preview link. */
export async function uploadReference(file: File) {
  return api<{ key: string; url: string }>("/api/uploads", {
    body: file,
    headers: { "content-type": file.type || "application/octet-stream", "x-filename": encodeURIComponent(file.name) },
  });
}

export async function startCheckout(body: { kind: "plan"; planId: PlanId } | { kind: "pack"; packId: string }) {
  try {
    const { url } = await api<{ url: string }>("/api/billing/checkout", { json: body });
    location.assign(url);
  } catch (err) {
    showApiError(err);
  }
}

export async function openBillingPortal() {
  try {
    const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
    location.assign(url);
  } catch (err) {
    showApiError(err);
  }
}
