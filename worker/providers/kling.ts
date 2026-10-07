import { getModel } from "@/lib/catalog/models";
import { buildPrompt } from "@/lib/prompt";
import { readReference, toBase64 } from "../media";
import { refsBySlot, vendorFetch, VendorRejected, type Provider } from "./types";

const BASE = "https://api-singapore.klingai.com";

interface KlingEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
interface KlingTask {
  id: string;
  status: "submitted" | "processing" | "succeeded" | "failed";
  message?: string;
  outputs?: { type: string; url?: string; watermark_url?: string }[];
}

const headers = (env: Env) => ({ authorization: `Bearer ${env.KLING_API_KEY}`, "content-type": "application/json" });

function unwrap<T>(res: KlingEnvelope<T>): T {
  if (res.code !== 0) throw new VendorRejected(`Kling: ${res.message || `error ${res.code}`}`);
  return res.data;
}

/** Kling 3.0 / 2.6 text-to-video and image-to-video (first + optional last frame). Images go inline as base64. */
export const klingProvider: Provider = {
  id: "kling",
  async submit(job) {
    const { env, params } = job;
    const model = getModel(params.modelId);
    const vendorModel = model.api!.vendorModelId;
    const prompt = buildPrompt(params);
    const settings: Record<string, unknown> = { resolution: params.resolution, duration: params.duration };
    if (model.supports.audio) settings.audio = params.audio ? "native" : "off";
    if (vendorModel === "kling-3.0") settings.multi_shot = false;
    const options = { external_task_id: job.genId, watermark_info: { enabled: job.watermark } };

    const [first] = refsBySlot(params, "first");
    const [last] = refsBySlot(params, "last");
    let path: string;
    let body: Record<string, unknown>;
    if (first) {
      const contents: Record<string, unknown>[] = [{ type: "prompt", text: prompt || "Animate this frame" }];
      for (const [type, ref] of [["first_frame", first], ["last_frame", last]] as const) {
        if (ref) contents.push({ type, url: toBase64((await readReference(env, job.userId, ref)).bytes) });
      }
      path = `/image-to-video/${vendorModel}`;
      body = { contents, settings, options };
    } else {
      path = `/text-to-video/${vendorModel}`;
      body = { prompt, settings: { ...settings, aspect_ratio: params.aspectRatio }, options };
    }

    const res = await vendorFetch<KlingEnvelope<KlingTask>>("Kling", `${BASE}${path}`, { method: "POST", headers: headers(env), body: JSON.stringify(body) });
    return { taskId: unwrap(res).id };
  },

  async poll(job, taskId) {
    const res = await vendorFetch<KlingEnvelope<KlingTask[]>>("Kling", `${BASE}/tasks?task_ids=${encodeURIComponent(taskId)}`, { headers: headers(job.env) });
    const task = unwrap(res)[0];
    if (!task || task.status === "submitted" || task.status === "processing") return { state: "pending" };
    if (task.status === "failed") return { state: "failed", error: `Kling couldn't render this: ${task.message || "unknown reason"}` };
    const video = task.outputs?.find((o) => o.type === "video");
    const url = (job.watermark && video?.watermark_url) || video?.url;
    return url ? { state: "download", url } : { state: "failed", error: "Kling finished without a video" };
  },
};
