import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FREE_TIER_GENERATIONS } from "@/lib/catalog/plans";
import type { CreditLedgerEntry, Generation, MediaRef, PlanId, ProviderId, StudioParams } from "@/lib/types";
import { ApiError } from "./http";
import { signedMediaUrl } from "./media";

export interface GenerationRow {
  id: string;
  user_id: string;
  action: Generation["action"];
  parent_id: string | null;
  remix_of: string | null;
  params: StudioParams;
  mode: "video" | "image";
  provider: ProviderId | "mock";
  status: Generation["status"];
  cost: string | number;
  free_tier: boolean;
  unlimited: boolean;
  refunded: boolean;
  watermark: boolean;
  favorite: boolean;
  duration_ms: number;
  vendor_task_id: string | null;
  error: string | null;
  output: MediaRef | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProfileRow {
  id: string;
  plan_id: PlanId;
  credits: string | number;
  free_generations: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface LedgerRow {
  id: number;
  at: string;
  delta: string | number;
  balance_after: string | number;
  reason: CreditLedgerEntry["reason"];
  generation_id: string | null;
  note: string;
}

let cached: { url: string; client: SupabaseClient } | null = null;

export function isBackendConfigured(env: Env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Service-role client: bypasses RLS, so every query here must filter by the authenticated user. */
export function db(env: Env): SupabaseClient {
  if (!isBackendConfigured(env)) throw new ApiError(503, "backend_off", "The backend is not configured");
  if (cached?.url !== env.SUPABASE_URL) {
    cached = {
      url: env.SUPABASE_URL,
      client: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
    };
  }
  return cached.client;
}

export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function getProfile(env: Env, userId: string): Promise<ProfileRow> {
  const rows = must(await db(env).rpc("lock_profile", { p_user: userId }), "lock_profile") as ProfileRow | ProfileRow[];
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function getLedger(env: Env, userId: string): Promise<CreditLedgerEntry[]> {
  const rows = must(
    await db(env).from("credit_ledger").select("*").eq("user_id", userId).order("at", { ascending: false }).limit(200),
    "ledger",
  ) as LedgerRow[];
  return rows.map((r) => ({
    id: String(r.id),
    at: r.at,
    delta: Number(r.delta),
    balanceAfter: Number(r.balance_after),
    reason: r.reason,
    generationId: r.generation_id ?? undefined,
    note: r.note,
  }));
}

export function toProfile(p: ProfileRow, ledger: CreditLedgerEntry[]) {
  return {
    planId: p.plan_id,
    credits: Number(p.credits),
    freeGenerations: Math.min(FREE_TIER_GENERATIONS, p.free_generations),
    createdAt: p.created_at,
    ledger,
    subscribed: Boolean(p.stripe_subscription_id),
  };
}

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : undefined);

async function signOutput(env: Env, origin: string, out: MediaRef | null): Promise<MediaRef | undefined> {
  if (!out) return undefined;
  if (!out.key) return out;
  return { ...out, src: await signedMediaUrl(env, origin, out.key) };
}

async function signParams(env: Env, origin: string, params: StudioParams): Promise<StudioParams> {
  if (!params.references.some((r) => r.key)) return params;
  const references = await Promise.all(params.references.map(async (r) => (r.key ? { ...r, url: await signedMediaUrl(env, origin, r.key) } : r)));
  return { ...params, references };
}

/** Shapes a row like the client's `Generation`, with fresh signed links for anything stored in R2. */
export async function toGeneration(env: Env, origin: string, row: GenerationRow): Promise<Generation> {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    parentId: row.parent_id ?? undefined,
    params: await signParams(env, origin, row.params),
    status: row.status,
    progress: row.status === "completed" ? 100 : 0,
    cost: Number(row.cost),
    freeTier: row.free_tier,
    unlimited: row.unlimited,
    refunded: row.refunded,
    createdAt: ms(row.created_at)!,
    startedAt: ms(row.started_at),
    finishedAt: ms(row.finished_at),
    durationMs: row.duration_ms,
    error: row.error ?? undefined,
    output: await signOutput(env, origin, row.output),
    favorite: row.favorite,
    remixOf: row.remix_of ?? undefined,
    watermark: row.watermark,
    provider: row.provider,
  };
}

export async function getGeneration(env: Env, id: string): Promise<GenerationRow | null> {
  const rows = must(await db(env).from("generations").select("*").eq("id", id).limit(1), "generation") as GenerationRow[];
  return rows[0] ?? null;
}

/** Maps the RPC's `raise exception 'code:detail'` errors to API errors. */
export function rpcError(message: string): ApiError | null {
  const [code, detail] = message.split(":");
  if (code === "insufficient_credits") return new ApiError(402, "credits", `Need ${detail} more credits`, { shortBy: Number(detail) });
  if (code === "plan_required") return new ApiError(402, "plan", "Your plan doesn't include this model", { requiredPlan: detail });
  if (code === "id_conflict") return new ApiError(409, "id_conflict", "Generation id already used");
  return null;
}
