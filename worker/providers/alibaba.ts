import { getModel } from "@/lib/catalog/models";
import { buildPrompt } from "@/lib/prompt";
import { signedMediaUrl } from "../media";
import { refsBySlot, vendorFetch, VendorRejected, type JobInput, type Provider } from "./types";

const base = (env: Env) => `https://${env.DASHSCOPE_WORKSPACE_ID}.${env.DASHSCOPE_REGION || "ap-southeast-1"}.maas.aliyuncs.com/api/v1`;
const headers = (env: Env) => ({ authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "content-type": "application/json" });

interface DashScopeTask {
  output?: { task_id?: string; task_status?: string; video_url?: string; code?: string; message?: string };
  code?: string;
  message?: string;
}

/** DashScope downloads frames itself, so they must be reachable from the internet. */
async function publicUrl(job: JobInput, ref: { key?: string; url: string }) {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(job.origin)) {
    throw new VendorRejected("Wan needs a public URL for frame references — deploy or use a tunnel for local testing");
  }
  if (ref.key) {
    if (!ref.key.startsWith(`u/${job.userId}/`)) throw new VendorRejected("Reference belongs to another account");
    return signedMediaUrl(job.env, job.origin, ref.key, 6 * 3600);
  }
  if (ref.url.startsWith("/media/")) return `${job.origin}${ref.url}`;
  throw new VendorRejected("Unsupported reference");
}

const RES = { "720p": "720P", "1080p": "1080P" } as const;

/** Wan 2.7 text-to-video (`wan2.7-t2v`) or, with a first frame, image-to-video (`wan2.7-i2v`). */
export const wanProvider: Provider = {
  id: "alibaba",
  async submit(job) {
    const { params, env } = job;
    const t2v = getModel(params.modelId).api!.vendorModelId;
    const [first] = refsBySlot(params, "first");
    const [last] = refsBySlot(params, "last");
    const resolution = RES[params.resolution as keyof typeof RES] ?? "720P";
    const prompt = buildPrompt(params);

    const body = first
      ? {
          model: t2v.replace("t2v", "i2v"),
          input: {
            prompt,
            media: [
              { type: "first_frame", url: await publicUrl(job, first) },
              ...(last ? [{ type: "last_frame", url: await publicUrl(job, last) }] : []),
            ],
          },
          parameters: { resolution, duration: params.duration, watermark: job.watermark, seed: params.seed },
        }
      : {
          model: t2v,
          input: { prompt },
          parameters: { resolution, ratio: params.aspectRatio, duration: params.duration, watermark: job.watermark, seed: params.seed },
        };

    const res = await vendorFetch<DashScopeTask>("Wan", `${base(env)}/services/aigc/video-generation/video-synthesis`, {
      method: "POST",
      headers: { ...headers(env), "X-DashScope-Async": "enable" },
      body: JSON.stringify(body),
    });
    if (!res.output?.task_id) throw new VendorRejected(`Wan: ${res.message ?? res.code ?? "no task id returned"}`);
    return { taskId: res.output.task_id };
  },

  async poll(job, taskId) {
    const res = await vendorFetch<DashScopeTask>("Wan", `${base(job.env)}/tasks/${encodeURIComponent(taskId)}`, { headers: headers(job.env) });
    const out = res.output;
    if (out?.task_status === "SUCCEEDED") {
      return out.video_url ? { state: "download", url: out.video_url } : { state: "failed", error: "Wan finished without a video" };
    }
    if (out?.task_status === "FAILED" || out?.task_status === "CANCELED" || out?.task_status === "UNKNOWN") {
      return { state: "failed", error: `Wan couldn't render this: ${out.message ?? out.task_status}` };
    }
    return { state: "pending" };
  },
};
