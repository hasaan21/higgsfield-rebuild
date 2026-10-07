"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CREDIT_PACKS, PLAN_BY_ID } from "@/lib/catalog/plans";
import { formatCredits } from "@/lib/pricing";
import { usePaywall } from "@/lib/stores/paywall";
import { useSession } from "@/lib/stores/session";
import { toast } from "sonner";

export function PaywallDialog() {
  const { reason, close } = usePaywall();
  const topUp = useSession((s) => s.topUp);
  const setPlan = useSession((s) => s.setPlan);
  const router = useRouter();
  if (!reason) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        {reason.kind === "auth" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogIn className="size-4 text-primary" /> Sign in to generate
              </DialogTitle>
              <DialogDescription>Your settings are kept — you&apos;ll come straight back to this shot.</DialogDescription>
            </DialogHeader>
            <Button
              onClick={() => {
                close();
                router.push(`/login/?next=${encodeURIComponent(location.pathname + location.search)}`);
              }}
            >
              Sign in or create an account
            </Button>
          </>
        )}

        {reason.kind === "plan" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" /> Upgrade to {PLAN_BY_ID[reason.requiredPlan].name}
              </DialogTitle>
              <DialogDescription>{reason.message}.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {PLAN_BY_ID[reason.requiredPlan].highlights.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
            <div className="grid gap-2">
              <Button
                onClick={() => {
                  const plan = PLAN_BY_ID[reason.requiredPlan];
                  setPlan(plan.id);
                  toast.success(`You're on ${plan.name}`, { description: `${formatCredits(plan.credits)} credits added. Demo checkout — no payment taken.` });
                  close();
                }}
              >
                Upgrade to {PLAN_BY_ID[reason.requiredPlan].name} · ${PLAN_BY_ID[reason.requiredPlan].priceMonthly}/mo
              </Button>
              <Button variant="ghost" asChild onClick={close}>
                <Link href="/pricing/">Compare plans</Link>
              </Button>
            </div>
          </>
        )}

        {reason.kind === "credits" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="size-4 text-primary" /> Not enough credits
              </DialogTitle>
              <DialogDescription>
                {reason.message}. Top up instantly or upgrade for a bigger monthly allowance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_PACKS.map((p) => (
                <button
                  key={p.id}
                  className="rounded-lg border border-border bg-secondary/40 p-3 text-left transition-colors hover:border-primary/60"
                  onClick={() => {
                    topUp(p.credits, `Credit pack ${formatCredits(p.credits)} (demo checkout)`);
                    toast.success(`${formatCredits(p.credits)} credits added`, { description: "Demo checkout — no payment taken." });
                    close();
                  }}
                >
                  <p className="text-lg font-semibold tabular-nums">{formatCredits(p.credits)}</p>
                  <p className="text-xs text-muted-foreground">${p.price}</p>
                </button>
              ))}
            </div>
            <Button variant="outline" asChild onClick={close}>
              <Link href="/pricing/">See plans</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
