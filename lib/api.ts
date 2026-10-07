"use client";

import { create } from "zustand";
import { getAuthProvider, isSupabaseConfigured } from "@/lib/auth/provider";

/** Empty means same origin (production: the Worker serves the site). Set to the `wrangler dev` URL under `next dev`. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");

interface BackendState {
  /** `demo` runs everything in the browser; `live` sends generations, credits and payments through the Worker. */
  mode: "probing" | "demo" | "live";
  liveModelIds: string[];
  stripe: boolean;
}

export const useBackend = create<BackendState>()(() => ({ mode: "probing", liveModelIds: [], stripe: false }));

export const isLive = () => useBackend.getState().mode === "live";

let probe: Promise<void> | null = null;

/** The backend needs Supabase for accounts, so without it there's nothing to probe. */
export function probeBackend() {
  probe ??= (async () => {
    if (!isSupabaseConfigured) return useBackend.setState({ mode: "demo" });
    try {
      const res = await fetch(`${API_BASE}/api/config`, { cache: "no-store" });
      const cfg = res.ok ? ((await res.json()) as { backend: boolean; liveModelIds: string[]; stripe: boolean }) : null;
      useBackend.setState(cfg?.backend ? { mode: "live", liveModelIds: cfg.liveModelIds, stripe: cfg.stripe } : { mode: "demo" });
    } catch {
      useBackend.setState({ mode: "demo" });
    }
  })();
  return probe;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

interface ApiInit {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const token = await (await getAuthProvider()).getAccessToken();
  const headers: Record<string, string> = { ...init.headers };
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.json !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(0, "network", "Can't reach the server. Check your connection.");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiRequestError(res.status, String(data.error ?? "error"), String(data.message ?? `Request failed (${res.status})`), data);
  return data as T;
}
