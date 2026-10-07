import { getModel } from "@/lib/catalog/models";
import { UNLIMITED_DAILY_CAP } from "@/lib/catalog/plans";
import { durationMsFor } from "@/lib/engine";
import { ACTION_LABEL, actionCost, baseCost, quote } from "@/lib/pricing";
import { normalizeParams } from "@/lib/studio-defaults";
import type { GenerationAction, StudioParams, User } from "@/lib/types";
import { db, getGeneration, getLedger, getProfile, must, rpcError, toGeneration, toProfile, type GenerationRow } from "../db";
import { ApiError, json, readJson } from "../http";
import { providerIdFor } from "../providers";

const ACTIONS: GenerationAction[] = ["generate", "upscale", "extend", "reframe", "lipsync"];
const ID = /^gen_[a-z0-9]{8,32}$/;

interface SubmitBody {
  id: string;
  params: StudioParams;
  action?: GenerationAction;
  parentId?: string;
  remixOf?: string;
}

/** Only the user's own R2 uploads and bundled samples can be sent to a vendor; links are re-signed per request. */
function cleanReferences(params: StudioParams, userId: string): StudioParams {
  const references = params.references
    .filter((r) => (r.key ? r.key.startsWith(`u/${userId}/refs/`) : r.url.startsWith("/media/")))
    .map((r) => ({ id: String(r.id).slice(0, 40), slot: r.slot, kind: r.kind, name: String(r.name).slice(0, 200), url: r.key ? "" : r.url, ...(r.key ? { key: r.key } : {}) }));
  return { ...params, references, prompt: String(params.prompt ?? "").slice(0, 4000) };
}

function expectedMs(params: StudioParams, action: GenerationAction, live: boolean) {
  const model = getModel(params.modelId);
  if (!live || !model.api) return durationMsFor(params, action);
  const scale = model.mode === "video" ? Math.sqrt(Math.max(1, params.duration) / 5) : 1;
  return Math.round(model.api.etaSeconds * scale * 1000);
}

export async function submitGeneration(request: Request, env: Env, userId: string, origin: string) {
  const body = await readJson<SubmitBody>(request);
  const action = body.action ?? "generate";
  if (!ID.test(body.id ?? "")) throw new ApiError(400, "bad_id", "Invalid generation id");
  if (!ACTIONS.includes(action)) throw new ApiError(400, "bad_action", "Unknown action");
  if (!body.params || typeof body.params !== "object") throw new ApiError(400, "bad_params", "Missing params");

  const params = normalizeParams(cleanReferences(body.params, userId));
  const model = getModel(params.modelId);

  if (body.parentId) {
    const parent = await getGeneration(env, body.parentId);
    if (!parent || parent.user_id !== userId) throw new ApiError(404, "not_found", "Original generation not found");
  }

  const profile = await getProfile(env, userId);
  const user = { id: userId, planId: profile.plan_id, credits: Number(profile.credits), freeGenerations: profile.free_generations } as User;
  const q = quote(params, user, action);
  if (q.blocked?.kind === "invalid") throw new ApiError(400, "invalid", q.blocked.message);

  const provider = providerIdFor(env, model, action);
  const fullCost = action === "generate" ? baseCost(model, params).total : actionCost(action, params);
  const note = action === "generate" ? `${model.name} · ${params.duration ? `${params.duration}s ` : ""}${params.resolution}` : ACTION_LABEL[action];

  const res = await db(env).rpc("debit_for_generation", {
    p_user: userId,
    p_id: body.id,
    p_action: action,
    p_parent_id: body.parentId ?? null,
    p_remix_of: body.remixOf ? String(body.remixOf).slice(0, 80) : null,
    p_params: params,
    p_mode: model.mode,
    p_provider: provider,
    p_cost: fullCost,
    p_min_plan: model.minPlan,
    p_unlimited_plans: action === "generate" ? model.unlimitedOn : [],
    p_unlimited_daily_cap: UNLIMITED_DAILY_CAP,
    p_free_allowed: action === "generate",
    p_duration_ms: expectedMs(params, action, provider !== "mock"),
    p_note: note,
  });
  if (res.error) throw rpcError(res.error.message) ?? new Error(`debit_for_generation: ${res.error.message}`);
  const row = res.data as GenerationRow;

  try {
    await env.GENERATE.create({ id: row.id, params: { genId: row.id, origin } });
  } catch (err) {
    // A replayed request finds the instance already running; anything else means the job can never start.
    const existing = await env.GENERATE.get(row.id).catch(() => null);
    if (!existing) {
      await db(env).from("generations").update({ status: "processing" }).eq("id", row.id).eq("status", "queued");
      await db(env).rpc("finish_generation", { p_id: row.id, p_status: "failed", p_output: null, p_error: "Couldn't start the job. Credits were refunded." });
      throw err;
    }
  }

  const [fresh, ledger] = await Promise.all([getProfile(env, userId), getLedger(env, userId)]);
  return json({ generation: await toGeneration(env, origin, row), profile: toProfile(fresh, ledger) }, { status: 201 });
}

export async function listGenerations(request: Request, env: Env, userId: string, origin: string) {
  const since = new URL(request.url).searchParams.get("since");
  let query = db(env).from("generations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(300);
  if (since) query = query.gt("updated_at", new Date(Number(since) || since).toISOString());
  const rows = must(await query, "list generations") as GenerationRow[];
  const live = rows.filter((r) => !r.deleted_at);
  return json({
    generations: await Promise.all(live.map((r) => toGeneration(env, origin, r))),
    deleted: rows.filter((r) => r.deleted_at).map((r) => r.id),
    cursor: rows[0]?.updated_at ?? since ?? null,
  });
}

async function stopWorkflow(env: Env, id: string) {
  try {
    await (await env.GENERATE.get(id)).terminate();
  } catch {
    // Already finished or never started; the database status is what matters.
  }
}

export async function cancelGeneration(env: Env, userId: string, id: string) {
  const prev = String(must(await db(env).rpc("cancel_generation", { p_user: userId, p_id: id }), "cancel_generation"));
  if (prev === "missing") throw new ApiError(404, "not_found", "Generation not found");
  if (prev === "queued" || prev === "processing") await stopWorkflow(env, id);
  const [profile, ledger] = await Promise.all([getProfile(env, userId), getLedger(env, userId)]);
  return json({ previous: prev, profile: toProfile(profile, ledger) });
}

export async function updateGeneration(request: Request, env: Env, userId: string, id: string) {
  const body = await readJson<{ favorite?: boolean }>(request);
  if (typeof body.favorite !== "boolean") throw new ApiError(400, "bad_body", "Only `favorite` can be changed");
  must(await db(env).from("generations").update({ favorite: body.favorite }).eq("id", id).eq("user_id", userId), "favorite");
  return json({ ok: true });
}

export async function deleteGeneration(env: Env, userId: string, id: string) {
  const row = await getGeneration(env, id);
  if (!row || row.user_id !== userId) throw new ApiError(404, "not_found", "Generation not found");
  if (row.status === "queued" || row.status === "processing") {
    await db(env).rpc("cancel_generation", { p_user: userId, p_id: id });
    await stopWorkflow(env, id);
  }
  must(await db(env).from("generations").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId), "delete");
  if (row.output?.key) await env.MEDIA.delete(row.output.key);
  return json({ ok: true });
}
