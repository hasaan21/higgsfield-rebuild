import { MODELS } from "@/lib/catalog/models";
import type { GenerationAction, ModelSpec, ProviderId } from "@/lib/types";
import { wanProvider } from "./alibaba";
import { seedanceProvider } from "./byteplus";
import { nanoBananaProvider, veoProvider } from "./google";
import { klingProvider } from "./kling";
import { mockProvider } from "./mock";
import type { Provider } from "./types";

const HAS_KEY: Record<ProviderId, (env: Env) => boolean> = {
  kling: (env) => Boolean(env.KLING_API_KEY),
  google: (env) => Boolean(env.GEMINI_API_KEY),
  byteplus: (env) => Boolean(env.ARK_API_KEY),
  alibaba: (env) => Boolean(env.DASHSCOPE_API_KEY && env.DASHSCOPE_WORKSPACE_ID),
};

export function isLive(env: Env, model: ModelSpec) {
  return Boolean(model.api && HAS_KEY[model.api.provider](env));
}

export const liveModelIds = (env: Env) => MODELS.filter((m) => isLive(env, m)).map((m) => m.id);

/** Upscale, extend, reframe and lip-sync have no vendor integration yet, so they always use the mock. */
export function providerIdFor(env: Env, model: ModelSpec, action: GenerationAction): ProviderId | "mock" {
  return action === "generate" && isLive(env, model) ? model.api!.provider : "mock";
}

export function providerFor(id: ProviderId | "mock", modelId: string): Provider {
  switch (id) {
    case "kling":
      return klingProvider;
    case "google":
      return modelId === "nano-banana-2-1" ? nanoBananaProvider : veoProvider;
    case "byteplus":
      return seedanceProvider;
    case "alibaba":
      return wanProvider;
    default:
      return mockProvider;
  }
}
