"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Coins, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MODELS } from "@/lib/catalog/models";
import { CREDIT_PACKS, PLAN_RANK, PLANS } from "@/lib/catalog/plans";
import { useHydrated, useUser } from "@/lib/hooks";
import { baseCost, formatCredits } from "@/lib/pricing";
import { useSession } from "@/lib/stores/session";
import { defaultParams } from "@/lib/studio-defaults";
import type { PlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

const SAMPLE = defaultParams();

const FAQ = [
  ["What does a generation cost?", "Base price for the model, scaled by duration and resolution. The Generate button shows the exact number and a breakdown before you click — no surprises."],
  ["Do failed generations cost credits?", "No. If a job fails, or you cancel it before it starts, the credits go straight back to your balance. You'll see it in the ledger."],
  ["What does “unlimited” mean?", "On Plus and Ultra, the listed models cost 0 credits. They run in a separate lane, one at a time per mode, so they never block your paid slots."],
  ["Is this real checkout?", "No — this is a demo rebuild. Choosing a plan or pack updates your balance instantly with no payment."],
];

export default function PricingPage() {
  const user = useUser();
  const hydrated = useHydrated();
  const router = useRouter();
  const setPlan = useSession((s) => s.setPlan);
  const topUp = useSession((s) => s.topUp);
  const choose = (id: PlanId) => {
    if (!user) return router.push(`/login/?mode=signup&next=/pricing/`);
    setPlan(id);
    const plan = PLANS.find((p) => p.id === id)!;
    toast(`You're on ${plan.name}`, { description: plan.credits ? `${plan.credits.toLocaleString()} credits added (demo checkout)` : undefined });
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Simple plans. Honest credits.</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Every price is shown before you generate. Failed jobs refund automatically.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const current = hydrated && user?.planId === p.id;
          const popular = p.id === "plus";
          const downgrade = hydrated && user ? PLAN_RANK[p.id] < PLAN_RANK[user.planId] : false;
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-2xl border bg-card p-5", popular ? "border-primary shadow-[0_0_60px_-20px] shadow-primary/50" : "border-border")}>
              {popular && <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground uppercase">Most popular</span>}
              <p className="font-medium">{p.name}</p>
              <p className="mt-2">
                <span className="text-3xl font-semibold">${p.priceMonthly}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{h}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={popular ? "default" : "secondary"} disabled={current || downgrade || (p.id === "free" && !!user)} onClick={() => choose(p.id)}>
                {current ? "Current plan" : p.id === "free" ? (user ? "Included" : "Start free") : downgrade ? "Contact support" : `Get ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Need more credits?</h2>
          <p className="text-sm text-muted-foreground">Packs never expire and stack on any plan.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {CREDIT_PACKS.map((pk) => (
              <button
                key={pk.id}
                onClick={() => {
                  if (!user) return router.push(`/login/?next=/pricing/`);
                  topUp(pk.credits, `Credit pack ${formatCredits(pk.credits)} (demo checkout)`);
                  toast(`+${pk.credits.toLocaleString()} credits`, { description: "Demo checkout" });
                }}
                className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/60"
              >
                <Coins className="size-4 text-primary" />
                <p className="mt-2 text-lg font-semibold">{pk.credits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  ${pk.price} · {((pk.price / pk.credits) * 100).toFixed(1)}¢/cr
                </p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">What things cost</h2>
          <p className="text-sm text-muted-foreground">One 5-second clip or one image, at the lowest resolution.</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {MODELS.map((m, i) => {
              const res = m.resolutions[0];
              const cost = baseCost(m, { ...SAMPLE, duration: m.durations[0], resolution: res }).total;
              return (
                <div key={m.id} className={cn("flex items-center justify-between px-4 py-2 text-sm", i % 2 && "bg-secondary/30")}>
                  <span>
                    {m.name} <span className="text-xs text-muted-foreground">· {m.mode === "video" ? `${m.durations[0]}s ` : ""}{res}</span>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {m.unlimitedOn.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-primary">
                        <InfinityIcon className="size-3" /> on {m.unlimitedOn.map((id) => PLANS.find((p) => p.id === id)!.name).join("/")}
                      </span>
                    )}
                    {formatCredits(cost)} cr
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-lg font-semibold">Questions</h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ready?{" "}
          <Link href="/studio/" className="text-primary hover:underline">
            Open the Studio
          </Link>
        </p>
      </section>
    </main>
  );
}
