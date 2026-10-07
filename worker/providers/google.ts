import { getModel } from "@/lib/catalog/models";
import { buildPrompt } from "@/lib/prompt";
import { readReference, toBase64 } from "../media";
import { dimensionsFor, refsBySlot, vendorFetch, VendorRejected, type JobInput, type Provider } from "./types";

const BASE = "https://generativelanguage.googleapis.com";
const headers = (env: Env) => ({ "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" });

async function inline(job: JobInput, ref: { key?: string; url: string }) {
  const { bytes, mime } = await readReference(job.env, job.userId, ref);
  return { inlineData: { mimeType: mime, data: toBase64(bytes) } };
}

interface VeoOperation {
  name: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: { video?: { uri?: string } }[];
      raiMediaFilteredReasons?: string[];
    };
  };
}

/** Veo 3.1 via `predictLongRunning`; the operation name is the task id. */
export const veoProvider: Provider = {
  id: "google",
  async submit(job) {
    const { params } = job;
    const model = getModel(params.modelId);
    const instance: Record<string, unknown> = { prompt: buildPrompt(params) };
    const [first] = refsBySlot(params, "first");
    const [last] = refsBySlot(params, "last");
    const subjects = refsBySlot(params, "subject").slice(0, model.maxReferences);
    if (first) instance.image = await inline(job, first);
    if (first && last) instance.lastFrame = await inline(job, last);
    if (subjects.length) {
      instance.referenceImages = await Promise.all(subjects.map(async (r) => ({ image: await inline(job, r), referenceType: "asset" })));
    }
    const body = {
      instances: [instance],
      parameters: { aspectRatio: params.aspectRatio, resolution: params.resolution, durationSeconds: params.duration, seed: params.seed },
    };
    const op = await vendorFetch<VeoOperation>("Veo", `${BASE}/v1beta/models/${model.api!.vendorModelId}:predictLongRunning`, {
      method: "POST",
      headers: headers(job.env),
      body: JSON.stringify(body),
    });
    return { taskId: op.name };
  },

  async poll(job, taskId) {
    const op = await vendorFetch<VeoOperation>("Veo", `${BASE}/v1beta/${taskId}`, { headers: headers(job.env) });
    if (!op.done) return { state: "pending" };
    if (op.error) return { state: "failed", error: `Veo couldn't render this: ${op.error.message ?? "unknown reason"}` };
    const res = op.response?.generateVideoResponse;
    const uri = res?.generatedSamples?.[0]?.video?.uri;
    if (!uri) return { state: "failed", error: `Veo blocked this request: ${res?.raiMediaFilteredReasons?.[0] ?? "content policy"}` };
    return { state: "download", url: uri, headers: { "x-goog-api-key": job.env.GEMINI_API_KEY } };
  },
};

interface ImageResponse {
  candidates?: { finishReason?: string; content?: { parts?: { inlineData?: InlinePart; inline_data?: InlinePart }[] } }[];
  promptFeedback?: { blockReason?: string };
}
interface InlinePart {
  mimeType?: string;
  mime_type?: string;
  data: string;
}

const IMAGE_SIZE = { "1080p": "2K", "4k": "4K" } as const;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Nano Banana 2.1 answers synchronously with base64, so the image is written to R2 straight from submit. */
export const nanoBananaProvider: Provider = {
  id: "google",
  async submit(job) {
    const { params, env } = job;
    const model = getModel(params.modelId);
    const refs = refsBySlot(params, "subject").slice(0, model.maxReferences);
    const parts: Record<string, unknown>[] = [{ text: buildPrompt(params) || "An image inspired by these references" }];
    for (const r of refs) parts.push(await inline(job, r));
    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        responseFormat: { image: { aspectRatio: params.aspectRatio, imageSize: IMAGE_SIZE[params.resolution as keyof typeof IMAGE_SIZE] ?? "2K" } },
      },
    };
    const res = await vendorFetch<ImageResponse>("Nano Banana", `${BASE}/v1/models/${model.api!.vendorModelId}:generateContent`, {
      method: "POST",
      headers: headers(env),
      body: JSON.stringify(body),
    });
    const candidate = res.candidates?.[0];
    const image = candidate?.content?.parts?.map((p) => p.inlineData ?? p.inline_data).find(Boolean);
    if (!image) {
      throw new VendorRejected(`Nano Banana returned no image (${res.promptFeedback?.blockReason ?? candidate?.finishReason ?? "no reason given"})`);
    }
    const mime = image.mimeType ?? image.mime_type ?? "image/png";
    const key = `${job.outputKey}.${EXT[mime] ?? "png"}`;
    await env.MEDIA.put(key, Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0)), { httpMetadata: { contentType: mime } });
    return { output: { kind: "image", src: "", poster: "", key, ...dimensionsFor(params.resolution, params.aspectRatio) } };
  },
  async poll() {
    return { state: "failed", error: "Nano Banana has no task to poll" };
  },
};
