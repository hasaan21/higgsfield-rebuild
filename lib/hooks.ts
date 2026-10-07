"use client";

import { useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectUser, useSession } from "@/lib/stores/session";

const subscribe = () => () => {};

/** False during prerender and the hydration pass, true afterwards; guards UI that depends on localStorage. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useUser() {
  return useSession(useShallow(selectUser));
}
