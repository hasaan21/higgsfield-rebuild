import type { AspectRatio, GenerationAction, MediaRef, ProviderId, Reference, Resolution, StudioParams } from "@/lib/types";

export interface JobInput {
  env: Env;
  genId: string;
  userId: string;
  /** Public origin of the deployment, for links vendors fetch themselves. */
  origin: string;
  params: StudioParams;
  action: GenerationAction;
  watermark: boolean;
  durationMs: number;
  /** R2 key prefix for this job's files, e.g. `u/<user>/gen/<id>`. */
  outputKey: string;
  parentOutput?: MediaRef;
}

export type Submitted = { taskId: string } | { output: MediaRef };

export type PollResult =
  | { state: "pending" }
  | { state: "download"; url: string; headers?: Record<string, string> }
  | { state: "ready"; output: MediaRef }
  | { state: "failed"; error: string };

export interface Provider {
  id: ProviderId | "mock";
  submit(job: JobInput): Promise<Submitted>;
  poll(job: JobInput, taskId: string, submittedAt: number): Promise<PollResult>;
}

/** The vendor said no (bad input, moderation, no balance). Retrying won't help, so the job fails and is refunded. */
export class VendorRejected extends Error {
  name = "VendorRejected";
}

export async function vendorFetch<T>(vendor: string, url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const detail = typeof body === "object" && body ? extractMessage(body) : text.slice(0, 300);
    const message = `${vendor} returned HTTP ${res.status}${detail ? `: ${detail}` : ""}`;
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw new VendorRejected(message);
    throw new Error(message);
  }
  return body as T;
}

function extractMessage(body: object): string {
  const b = body as Record<string, unknown>;
  const err = b.error as Record<string, unknown> | string | undefined;
  if (typeof err === "string") return err;
  return String(err?.message ?? b.message ?? b.msg ?? "");
}

export const refsBySlot = (params: StudioParams, slot: Reference["slot"]) => params.references.filter((r) => r.slot === slot);

const LONG_EDGE: Record<Resolution, number> = { "480p": 854, "720p": 1280, "1080p": 1920, "4k": 3840 };
const RATIO: Record<AspectRatio, number> = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "21:9": 21 / 9 };

/** Nominal output size for the library grid; vendors may differ by a few pixels. */
export function dimensionsFor(resolution: Resolution, aspect: AspectRatio) {
  const edge = LONG_EDGE[resolution];
  const r = RATIO[aspect];
  return r >= 1 ? { width: edge, height: Math.round(edge / r) } : { width: Math.round(edge * r), height: edge };
}
