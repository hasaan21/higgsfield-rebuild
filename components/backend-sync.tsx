"use client";

import { useEffect } from "react";
import { probeBackend, useBackend } from "@/lib/api";
import { refreshProfile, resetSync, syncGenerations } from "@/lib/live";
import { switchQueueToServer } from "@/lib/stores/queue";
import { useSession } from "@/lib/stores/session";
import { useStudio } from "@/lib/stores/studio";

/** Detects the Worker backend and, when it's there, loads the signed-in user's profile and jobs from it. */
export function BackendSync() {
  const mode = useBackend((s) => s.mode);
  const userId = useSession((s) => s.identity?.id ?? null);

  useEffect(() => {
    void probeBackend();
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    useSession.getState().setLive(true);
    void switchQueueToServer();
    const adopt = () => useStudio.getState().adoptLiveDefaults(useBackend.getState().liveModelIds);
    if (useStudio.persist.hasHydrated()) adopt();
    else return useStudio.persist.onFinishHydration(adopt);
  }, [mode]);

  useEffect(() => {
    if (mode !== "live" || !userId) return;
    let stale = false;
    resetSync();
    const load = () =>
      Promise.all([refreshProfile(), syncGenerations(true)]).catch((err) => {
        if (!stale) console.warn("Backend sync failed", err);
      });
    void switchQueueToServer().then(load);
    const onFocus = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stale = true;
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [mode, userId]);

  return null;
}
