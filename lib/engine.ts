import { getModel } from "@/lib/catalog/models";
import { hash } from "@/lib/id";
import { mediaRef, pickClip } from "@/lib/media";
import type { Generation, GenerationAction, MediaRef, Plan, StudioParams } from "@/lib/types";

/**
 * Mock inference engine. Stateless and timestamp-driven: a job's progress is a pure function of
 * (startedAt, durationMs, now), so reloading the page resumes every job where it left off.
 */

const FAILURE_RATE = 5;
const FAILURE_MESSAGES = [
  "Content moderation flagged the prompt. Credits were refunded.",
  "GPU capacity was exhausted for this model. Credits were refunded.",
  "The generation timed out upstream. Credits were refunded.",
];

const ACTION_MS: Partial<Record<GenerationAction, number>> = { upscale: 8000, extend: 11000, reframe: 6000, lipsync: 9000 };

export function durationMsFor(params: StudioParams, action: GenerationAction): number {
  if (ACTION_MS[action]) return ACTION_MS[action]!;
  const model = getModel(params.modelId);
  const durationFactor = model.mode === "video" ? Math.sqrt(Math.max(1, params.duration) / 5) : 1;
  const resFactor = params.resolution === "4k" ? 1.35 : params.resolution === "1080p" ? 1.12 : 1;
  const ms = model.simSeconds * durationFactor * resFactor * 1000;
  return Math.round(Math.min(40_000, Math.max(5_000, ms)));
}

/** Fast start, long middle, quick finish — reads like real diffusion progress. */
export function easedProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 100;
  const p = t < 0.1 ? t * 3 : t < 0.9 ? 0.3 + ((t - 0.1) / 0.8) * 0.58 : 0.88 + ((t - 0.9) / 0.1) * 0.12;
  return Math.min(99, Math.floor(p * 100));
}

export function failurePoint(id: string): number | null {
  const h = hash(id);
  return h % 100 < FAILURE_RATE ? 0.35 + ((h >>> 8) % 45) / 100 : null;
}

export function failureMessage(id: string) {
  return FAILURE_MESSAGES[hash(id + "msg") % FAILURE_MESSAGES.length];
}

export function outputFor(gen: Generation, parent?: Generation): MediaRef {
  const mode = getModel(gen.params.modelId).mode;
  if (parent?.output && gen.action !== "reframe") return { ...parent.output };
  const clip = pickClip(hash(`${gen.params.prompt}|${gen.params.seed}|${gen.action}`), gen.params.aspectRatio);
  return mediaRef(clip, mode === "video" ? "video" : "image");
}

export type EngineEvent = { type: "started" | "completed" | "failed"; gen: Generation };

/** Advance all of one user's jobs to `now`. Returns the new list and the transitions that happened. */
export function advance(all: Generation[], userId: string, plan: Plan, now: number): { next: Generation[]; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const byId = new Map(all.map((g) => [g.id, g]));

  const next = all.map((g) => {
    if (g.userId !== userId || g.status !== "processing" || !g.startedAt) return g;
    const t = (now - g.startedAt) / g.durationMs;
    const failAt = failurePoint(g.id);
    if (failAt !== null && t >= failAt) {
      const failed: Generation = { ...g, status: "failed", progress: Math.floor(failAt * 100), finishedAt: g.startedAt + failAt * g.durationMs, error: failureMessage(g.id) };
      events.push({ type: "failed", gen: failed });
      return failed;
    }
    if (t >= 1) {
      const done: Generation = { ...g, status: "completed", progress: 100, finishedAt: g.startedAt + g.durationMs, output: outputFor(g, g.parentId ? byId.get(g.parentId) : undefined) };
      events.push({ type: "completed", gen: done });
      return done;
    }
    const progress = easedProgress(t);
    return progress === g.progress ? g : { ...g, progress };
  });

  const mine = next.filter((g) => g.userId === userId);
  let creditSlots = plan.concurrency - mine.filter((g) => g.status === "processing" && !g.unlimited).length;
  const unlimitedBusy = new Set(mine.filter((g) => g.status === "processing" && g.unlimited).map((g) => getModel(g.params.modelId).mode));

  const queued = mine.filter((g) => g.status === "queued").sort((a, b) => a.createdAt - b.createdAt);
  const toStart = new Set<string>();
  for (const g of queued) {
    if (g.unlimited) {
      const mode = getModel(g.params.modelId).mode;
      if (!unlimitedBusy.has(mode)) {
        unlimitedBusy.add(mode);
        toStart.add(g.id);
      }
    } else if (creditSlots > 0) {
      creditSlots--;
      toStart.add(g.id);
    }
  }

  const result = toStart.size
    ? next.map((g) => {
        if (!toStart.has(g.id)) return g;
        const started: Generation = { ...g, status: "processing", startedAt: now, progress: 0 };
        events.push({ type: "started", gen: started });
        return started;
      })
    : next;

  return { next: result, events };
}

export function queuePositions(gens: Generation[]): Map<string, number> {
  const queued = gens.filter((g) => g.status === "queued").sort((a, b) => a.createdAt - b.createdAt);
  return new Map(queued.map((g, i) => [g.id, i + 1]));
}

export function etaSeconds(gen: Generation, now: number) {
  if (gen.status !== "processing" || !gen.startedAt) return null;
  return Math.max(0, Math.ceil((gen.startedAt + gen.durationMs - now) / 1000));
}
