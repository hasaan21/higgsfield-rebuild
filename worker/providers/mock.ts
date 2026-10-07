import { failureMessage, failurePoint, outputFor } from "@/lib/engine";
import type { Generation } from "@/lib/types";
import type { Provider } from "./types";

/** Same behaviour as the client demo engine, run on the server so it shares the real ledger. */
export const mockProvider: Provider = {
  id: "mock",
  async submit() {
    return { taskId: String(Date.now()) };
  },
  async poll(job, taskId) {
    const startedAt = Number(taskId);
    const t = (Date.now() - startedAt) / job.durationMs;
    const failAt = failurePoint(job.genId);
    if (failAt !== null && t >= failAt) return { state: "failed", error: failureMessage(job.genId) };
    if (t < 1) return { state: "pending" };
    const gen = { params: job.params, action: job.action } as Generation;
    return { state: "ready", output: outputFor(gen, job.parentOutput ? ({ output: job.parentOutput } as Generation) : undefined) };
  },
};
