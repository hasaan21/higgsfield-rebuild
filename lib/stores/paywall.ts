"use client";

import { create } from "zustand";
import type { BlockReason } from "@/lib/pricing";

interface PaywallState {
  reason: BlockReason | null;
  open: (reason: BlockReason) => void;
  close: () => void;
}

export const usePaywall = create<PaywallState>()((set) => ({
  reason: null,
  open: (reason) => set({ reason }),
  close: () => set({ reason: null }),
}));
