import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { PLANS } from "@/lib/catalog/plans";
import type { MediaRef } from "@/lib/types";
import { db, getGeneration, must } from "../db";
import { copyToR2 } from "../media";
import { providerFor } from "../providers";
import { dimensionsFor, VendorRejected, type JobInput, type PollResult } from "../providers/types";

export interface GenerateParams {
  genId: string;
  origin: string;
}

const CONCURRENCY = Object.fromEntries(PLANS.map((p) => [p.id, p.concurrency]));
/** Give up on a vendor job after this long; the user is refunded. */
const MAX_RENDER_MS = 45 * 60_000;
/** A job that can't get a slot for this long (e.g. a stuck job ahead of it) fails instead of waiting forever. */
const MAX_QUEUE_STEPS = 600;

const rejectNonRetryable = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof VendorRejected) throw new NonRetryableError(err.message);
    throw err;
  }
};

/**
 * One instance per generation, keyed by its id:
 * wait for a slot, submit to the vendor, poll until done, copy the result to R2, record the outcome.
 * Failures at any point mark the job failed, which refunds it in the same transaction.
 */
export class GenerateWorkflow extends WorkflowEntrypoint<Env, GenerateParams> {
  async run(event: WorkflowEvent<GenerateParams>, step: WorkflowStep) {
    const { genId, origin } = event.payload;
    const finish = async (status: "completed" | "failed", output: MediaRef | null, error: string | null) =>
      must(
        await db(this.env).rpc("finish_generation", { p_id: genId, p_status: status, p_output: output, p_error: error }),
        "finish_generation",
      );

    for (let i = 0; ; i++) {
      const status = await step.do(`claim slot ${i}`, async () =>
        String(must(await db(this.env).rpc("claim_slot", { p_id: genId, p_concurrency: CONCURRENCY }), "claim_slot")),
      );
      if (status === "processing") break;
      if (status !== "queued") return { skipped: status };
      if (i >= MAX_QUEUE_STEPS) {
        await step.do("expire in queue", async () => {
          await db(this.env).from("generations").update({ status: "processing", started_at: new Date().toISOString() }).eq("id", genId).eq("status", "queued");
          await finish("failed", null, "Waited too long for a free slot. Credits were refunded.");
        });
        return { skipped: "queue-timeout" };
      }
      await step.sleep(`wait for slot ${i}`, Math.min(30_000, 2_000 + i * 1_000));
    }

    const job = await step.do("load job", async () => {
      const row = await getGeneration(this.env, genId);
      if (!row) throw new NonRetryableError("Generation disappeared");
      const parent = row.parent_id ? await getGeneration(this.env, row.parent_id) : null;
      return {
        userId: row.user_id,
        params: row.params,
        action: row.action,
        watermark: row.watermark,
        durationMs: row.duration_ms,
        provider: row.provider,
        parentOutput: parent?.user_id === row.user_id && parent.output ? parent.output : undefined,
      };
    });

    const provider = providerFor(job.provider, job.params.modelId);
    const input = (): JobInput => ({ env: this.env, genId, origin, outputKey: `u/${job.userId}/gen/${genId}`, ...job });
    const isMock = job.provider === "mock";

    try {
      const submitted = await step.do("submit", { retries: { limit: 3, delay: "15 seconds", backoff: "exponential" }, timeout: "5 minutes" }, () =>
        rejectNonRetryable(async () => ({ ...(await provider.submit(input())), at: Date.now() })),
      );

      let output: MediaRef;
      if ("output" in submitted) {
        output = submitted.output;
      } else {
        const { taskId, at } = submitted;
        if (!isMock) {
          await step.do("save task id", async () => {
            must(await db(this.env).from("generations").update({ vendor_task_id: taskId }).eq("id", genId), "save task id");
          });
        }

        let result: PollResult;
        for (let i = 0; ; i++) {
          await step.sleep(`render ${i}`, isMock ? 2_000 : i === 0 ? 15_000 : 10_000);
          result = await step.do(`poll ${i}`, { retries: { limit: 5, delay: "10 seconds", backoff: "exponential" }, timeout: "1 minute" }, () =>
            rejectNonRetryable(async (): Promise<PollResult> => {
              const r = await provider.poll(input(), taskId, at);
              if (r.state === "pending" && Date.now() - at > MAX_RENDER_MS) return { state: "failed", error: "The model took too long to respond. Credits were refunded." };
              return r;
            }),
          );
          if (result.state !== "pending") break;
        }

        if (result.state === "failed") throw new Error(result.error);
        if (result.state === "ready") {
          output = result.output;
        } else {
          const { url, headers } = result as Extract<PollResult, { state: "download" }>;
          output = await step.do("store output", { retries: { limit: 3, delay: "20 seconds", backoff: "exponential" }, timeout: "10 minutes" }, async () => {
            const key = `${input().outputKey}.mp4`;
            await copyToR2(this.env, key, await fetch(url, { headers, redirect: "follow" }), "video/mp4");
            return { kind: "video" as const, src: "", poster: "", key, ...dimensionsFor(job.params.resolution, job.params.aspectRatio) };
          });
        }
      }

      await step.do("record result", async () => {
        await finish("completed", output, null);
      });
      return { status: "completed" };
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 400);
      console.error(JSON.stringify({ level: "warn", msg: "generation failed", genId, provider: job.provider, error: message }));
      await step.do("record failure", async () => {
        await finish("failed", null, message.includes("refunded") ? message : `${message} Credits were refunded.`);
      });
      return { status: "failed" };
    }
  }
}
