"use client";

import { useEffect } from "react";
import { getAuthProvider } from "@/lib/auth/provider";
import { useSession } from "@/lib/stores/session";

/** Syncs the active auth provider's session into the session store. Mounted once in Providers. */
export function AuthBridge() {
  const setIdentity = useSession((s) => s.setIdentity);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    getAuthProvider().then(async (provider) => {
      const identity = await provider.getSession();
      if (cancelled) return;
      setIdentity(identity);
      unsub = provider.onChange(setIdentity);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [setIdentity]);

  return null;
}
