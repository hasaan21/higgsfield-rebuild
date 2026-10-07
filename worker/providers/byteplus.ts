import { getModel } from "@/lib/catalog/models";
import { buildPrompt } from "@/lib/prompt";
import { readReference, toBase64 } from "../media";
import { refsBySlot, vendorFetch, type JobInput, type Provider } from "./types";

const BASE = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
const headers = (env: Env) => ({ authorization: `Bearer ${env.ARK_API_KEY}`, "content-type": "application/json" });

interface ArkTask {
  id: string;
  status?: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";
  content?: { video_url?: string };
  error?: { code?: string; message?: string };
}

async function imagePart(job: JobInput, ref: { key?: string; url: string }, role: string) {
  const { bytes, mime } = await readReference(job.env, job.userId, ref);
  return { type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(bytes)}` }, role };
}

/** Seedance 2.0 / 2.5 on BytePlus ModelArk. Frame locks and subject references are sent as base64 data URLs. */
export const seedanceProvider: Provider = {
  id: "byteplus",
  async submit(job) {
    const { params } = job;
    const model = getModel(params.modelId);
    const content: Record<string, unknown>[] = [{ type: "text", text: buildPrompt(params) }];
    const [first] = refsBySlot(params, "first");
    const [last] = refsBySlot(params, "last");
    if (first) {
      content.push(await imagePart(job, first, "first_frame"));
      if (last) content.push(await imagePart(job, last, "last_frame"));
    } else {
      for (const r of refsBySlot(params, "subject").slice(0, model.maxReferences)) content.push(await imagePart(job, r, "reference_image"));
    }
    const body = {
      model: model.api!.vendorModelId,
      content,
      ratio: first ? "adaptive" : params.aspectRatio,
      duration: params.duration,
      resolution: params.resolution,
      generate_audio: params.audio,
      watermark: job.watermark,
      seed: params.seed,
    };
    const task = await vendorFetch<ArkTask>("Seedance", BASE, { method: "POST", headers: headers(job.env), body: JSON.stringify(body) });
    return { taskId: task.id };
  },

  async poll(job, taskId) {
    const task = await vendorFetch<ArkTask>("Seedance", `${BASE}/${encodeURIComponent(taskId)}`, { headers: headers(job.env) });
    if (task.status === "succeeded") {
      return task.content?.video_url ? { state: "download", url: task.content.video_url } : { state: "failed", error: "Seedance finished without a video" };
    }
    if (task.status === "failed" || task.status === "cancelled" || task.status === "expired") {
      return { state: "failed", error: `Seedance couldn't render this: ${task.error?.message ?? task.status}` };
    }
    return { state: "pending" };
  },
};
