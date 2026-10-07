"use client";

import { toast } from "sonner";
import { useBackend } from "@/lib/api";
import { CREDIT_PACKS, PLAN_BY_ID } from "@/lib/catalog/plans";
import { openBillingPortal, refreshProfile, startCheckout } from "@/lib/live";
import { formatCredits } from "@/lib/pricing";
import { useSession } from "@/lib/stores/session";
import type { PlanId } from "@/lib/types";

/** Live mode sends the user to Stripe; demo mode applies the purchase instantly with no payment. */

function paymentsReady() {
  if (useBackend.getState().stripe) return true;
  toast.error("Payments aren't set up on this server yet");
  return false;
}

export function buyPlan(planId: PlanId) {
  const plan = PLAN_BY_ID[planId];
  if (useSession.getState().live) {
    if (paymentsReady()) void startCheckout({ kind: "plan", planId });
    return;
  }
  useSession.getState().setPlan(planId);
  toast.success(`You're on ${plan.name}`, { description: plan.credits ? `${formatCredits(plan.credits)} credits added. Demo checkout — no payment taken.` : undefined });
}

export function buyPack(packId: string) {
  const pack = CREDIT_PACKS.find((p) => p.id === packId)!;
  if (useSession.getState().live) {
    if (paymentsReady()) void startCheckout({ kind: "pack", packId });
    return;
  }
  useSession.getState().topUp(pack.credits, `Credit pack ${formatCredits(pack.credits)} (demo checkout)`);
  toast.success(`${formatCredits(pack.credits)} credits added`, { description: "Demo checkout — no payment taken." });
}

export function manageBilling() {
  if (paymentsReady()) void openBillingPortal();
}

/** After Stripe redirects back, credits land when the webhook arrives — usually within a few seconds. */
export async function awaitCheckoutResult() {
  const before = useSession.getState().server;
  const toastId = toast.loading("Confirming your payment…");
  for (let i = 0; i < 10; i++) {
    const profile = await refreshProfile().catch(() => null);
    if (profile && (profile.credits !== before?.credits || profile.planId !== before?.planId)) {
      toast.success("Payment confirmed", { id: toastId, description: `${PLAN_BY_ID[profile.planId].name} · ${formatCredits(profile.credits)} credits` });
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  toast("Payment received", { id: toastId, description: "Your credits will appear shortly." });
}
