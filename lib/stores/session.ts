"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthIdentity } from "@/lib/auth/provider";
import { FREE_TIER_GENERATIONS, PLAN_BY_ID } from "@/lib/catalog/plans";
import { uid } from "@/lib/id";
import type { CreditLedgerEntry, PlanId, User } from "@/lib/types";

interface Profile {
  planId: PlanId;
  credits: number;
  freeGenerations: number;
  createdAt: string;
  ledger: CreditLedgerEntry[];
}

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface SessionState {
  status: AuthStatus;
  identity: AuthIdentity | null;
  /** Per-user billing state, keyed by identity id. Kept in the browser: Supabase only handles auth. */
  profiles: Record<string, Profile>;
  setIdentity: (identity: AuthIdentity | null) => void;
  debit: (amount: number, note: string, generationId?: string) => void;
  refund: (amount: number, note: string, generationId?: string) => void;
  consumeFreeGeneration: () => void;
  restoreFreeGeneration: () => void;
  setPlan: (planId: PlanId) => void;
  topUp: (credits: number, note: string) => void;
}

const newProfile = (): Profile => ({
  planId: "free",
  credits: 0,
  freeGenerations: FREE_TIER_GENERATIONS,
  createdAt: new Date().toISOString(),
  ledger: [],
});

export const useSession = create<SessionState>()(
  persist(
    (set, get) => {
      const mutate = (fn: (p: Profile) => Profile) => {
        const id = get().identity?.id;
        if (!id) return;
        set((s) => ({ profiles: { ...s.profiles, [id]: fn(s.profiles[id] ?? newProfile()) } }));
      };
      const entry = (p: Profile, delta: number, reason: CreditLedgerEntry["reason"], note: string, generationId?: string): Profile => {
        const credits = Math.round((p.credits + delta) * 2) / 2;
        const e: CreditLedgerEntry = { id: uid("tx_"), at: new Date().toISOString(), delta, balanceAfter: credits, reason, note, generationId };
        return { ...p, credits, ledger: [e, ...p.ledger].slice(0, 200) };
      };

      return {
        status: "loading",
        identity: null,
        profiles: {},
        setIdentity: (identity) =>
          set((s) => ({
            identity,
            status: identity ? "authenticated" : "anonymous",
            profiles: identity && !s.profiles[identity.id] ? { ...s.profiles, [identity.id]: newProfile() } : s.profiles,
          })),
        debit: (amount, note, generationId) => amount > 0 && mutate((p) => entry(p, -amount, "generation", note, generationId)),
        refund: (amount, note, generationId) => amount > 0 && mutate((p) => entry(p, amount, "refund", note, generationId)),
        consumeFreeGeneration: () => mutate((p) => ({ ...p, freeGenerations: Math.max(0, p.freeGenerations - 1) })),
        restoreFreeGeneration: () => mutate((p) => ({ ...p, freeGenerations: Math.min(FREE_TIER_GENERATIONS, p.freeGenerations + 1) })),
        setPlan: (planId) =>
          mutate((p) => {
            const plan = PLAN_BY_ID[planId];
            const next = { ...p, planId };
            return plan.credits ? entry(next, plan.credits, "plan-grant", `${plan.name} plan — monthly credits`) : next;
          }),
        topUp: (credits, note) => mutate((p) => entry(p, credits, "top-up", note)),
      };
    },
    {
      name: "hf.session",
      version: 1,
      partialize: (s) => ({ profiles: s.profiles }),
    },
  ),
);

export function selectUser(s: SessionState): User | null {
  if (!s.identity) return null;
  const p = s.profiles[s.identity.id] ?? newProfile();
  return {
    id: s.identity.id,
    email: s.identity.email,
    name: s.identity.name,
    avatarUrl: s.identity.avatarUrl,
    provider: s.identity.provider,
    planId: p.planId,
    credits: p.credits,
    freeGenerations: p.freeGenerations,
    createdAt: p.createdAt,
  };
}

export function selectLedger(s: SessionState): CreditLedgerEntry[] {
  return s.identity ? (s.profiles[s.identity.id]?.ledger ?? []) : [];
}
