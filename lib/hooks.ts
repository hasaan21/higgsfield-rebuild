"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectUser, useSession } from "@/lib/stores/session";

const subscribe = () => () => {};

/** False during prerender and the hydration pass, true afterwards; guards UI that depends on localStorage. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/** Current time, refreshed every `intervalMs` while `isActive(now)` holds. */
export function useNow(isActive: (now: number) => boolean = () => true, intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  const active = isActive(now);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
  return now;
}

export function useUser() {
  return useSession(useShallow(selectUser));
}
