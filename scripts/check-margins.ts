/**
 * Fails if any live-model setting would cost more at the vendor than its credits bring in at the cheapest credit price.
 * Run with `pnpm check:margins`.
 */
import { MODELS, durationsFor } from "@/lib/catalog/models";
import { CREDIT_USD_FLOOR, PLANS } from "@/lib/catalog/plans";
import { baseCost, vendorCostUsd } from "@/lib/pricing";
import { defaultParams } from "@/lib/studio-defaults";

const base = defaultParams();
let failures = 0;
let rows = 0;

for (const model of MODELS.filter((m) => m.api)) {
  for (const resolution of model.resolutions) {
    for (const duration of model.mode === "video" ? durationsFor(model, resolution) : [0]) {
      for (const audio of model.supports.audio ? [false, true] : [false]) {
        const params = { ...base, modelId: model.id, mode: model.mode, resolution, duration, audio };
        const credits = baseCost(model, params).total;
        const revenue = credits * CREDIT_USD_FLOOR;
        const cost = vendorCostUsd(model, params);
        rows++;
        if (revenue < cost) {
          failures++;
          console.error(`LOSS  ${model.name} ${resolution} ${duration}s audio=${audio}: ${credits} cr = $${revenue.toFixed(3)} < vendor $${cost.toFixed(3)}`);
        }
      }
    }
  }
}

const unlimited = MODELS.filter((m) => m.api && m.unlimitedOn.length);
console.log(`Checked ${rows} live settings at $${CREDIT_USD_FLOOR.toFixed(4)}/credit: ${failures ? `${failures} below cost` : "all cover vendor cost"}.`);
if (unlimited.length) {
  console.log(
    `Unlimited lanes on live models (capped per day, uncovered by credits): ${unlimited
      .map((m) => `${m.name} on ${m.unlimitedOn.map((id) => PLANS.find((p) => p.id === id)!.name).join("/")}`)
      .join(", ")}.`,
  );
}
process.exit(failures ? 1 : 0);
