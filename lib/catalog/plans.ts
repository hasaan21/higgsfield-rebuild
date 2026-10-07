import type { Plan, PlanId } from "@/lib/types";

/** Demo values derived from docs/AUDIT.md (S5, S9, S11). Prices are illustrative. */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    credits: 0,
    concurrency: 1,
    watermark: true,
    allModels: false,
    highlights: ["3 free generations on starter models", "1 generation at a time", "Watermarked output"],
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 9,
    credits: 120,
    concurrency: 2,
    watermark: false,
    allModels: false,
    highlights: ["120 credits / month", "Cinema Studio & Soul Cinema", "2 parallel generations", "No watermark"],
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 49,
    credits: 1000,
    concurrency: 4,
    watermark: false,
    allModels: true,
    highlights: ["1,000 credits / month", "All models", "Unlimited Kling 3.0 & Soul 2.0", "4 parallel generations"],
  },
  {
    id: "ultra",
    name: "Ultra",
    priceMonthly: 99,
    credits: 3000,
    concurrency: 8,
    watermark: false,
    allModels: true,
    highlights: ["3,000 credits / month", "All models", "Unlimited Kling 3.0, Seedance 2.0, Soul 2.0, Nano Banana", "8 parallel generations"],
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;
export const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, plus: 2, ultra: 3 };
export const FREE_TIER_GENERATIONS = 3;

export const CREDIT_PACKS = [
  { id: "pack-100", credits: 100, price: 5 },
  { id: "pack-500", credits: 500, price: 22 },
  { id: "pack-2000", credits: 2000, price: 80 },
];

/** The least a credit can be bought for (USD), across plans and packs. Live-model prices are floored against it. */
export const CREDIT_USD_FLOOR = Math.min(
  ...PLANS.filter((p) => p.credits > 0).map((p) => p.priceMonthly / p.credits),
  ...CREDIT_PACKS.map((p) => p.price / p.credits),
);

/** Unlimited lanes still cost real money on live models; past this many jobs a day they're charged normally. */
export const UNLIMITED_DAILY_CAP = 30;
