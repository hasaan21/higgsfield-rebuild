import { createCheckout, createPortal, isStripeConfigured, stripeWebhook } from "./api/billing";
import { cancelGeneration, deleteGeneration, listGenerations, submitGeneration, updateGeneration } from "./api/generations";
import { requireUser } from "./auth";
import { getLedger, getProfile, isBackendConfigured, toProfile } from "./db";
import { ApiError, errorResponse, json, withCors } from "./http";
import { serveMedia, storeUpload } from "./media";
import { liveModelIds } from "./providers";

export { GenerateWorkflow } from "./workflows/generate";

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname: path } = url;
  const method = request.method;
  const origin = url.origin;

  if (path === "/api/config" && method === "GET") {
    const backend = isBackendConfigured(env);
    return json({ backend, liveModelIds: backend ? liveModelIds(env) : [], stripe: backend && isStripeConfigured(env) });
  }
  if (path.startsWith("/api/media/") && (method === "GET" || method === "HEAD")) {
    return serveMedia(request, env, decodeURIComponent(path.slice("/api/media/".length)));
  }
  if (path === "/api/stripe/webhook" && method === "POST") return stripeWebhook(request, env);

  if (!isBackendConfigured(env)) throw new ApiError(503, "backend_off", "The backend is not configured");
  const userId = await requireUser(request, env);

  if (path === "/api/me" && method === "GET") {
    const [profile, ledger] = await Promise.all([getProfile(env, userId), getLedger(env, userId)]);
    return json({ profile: toProfile(profile, ledger) });
  }
  if (path === "/api/uploads" && method === "POST") return json(await storeUpload(request, env, userId, origin), { status: 201 });
  if (path === "/api/generations") {
    if (method === "POST") return submitGeneration(request, env, userId, origin);
    if (method === "GET") return listGenerations(request, env, userId, origin);
  }
  const gen = path.match(/^\/api\/generations\/([^/]+)(\/cancel)?$/);
  if (gen) {
    const [, id, cancel] = gen;
    if (cancel && method === "POST") return cancelGeneration(env, userId, id);
    if (!cancel && method === "PATCH") return updateGeneration(request, env, userId, id);
    if (!cancel && method === "DELETE") return deleteGeneration(env, userId, id);
  }
  if (path === "/api/billing/checkout" && method === "POST") return createCheckout(request, env, userId);
  if (path === "/api/billing/portal" && method === "POST") return createPortal(request, env, userId);

  throw new ApiError(404, "not_found", "No such endpoint");
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return withCors(request, new Response(null, { status: 204 }));
    try {
      return withCors(request, await route(request, env));
    } catch (err) {
      return withCors(request, errorResponse(err));
    }
  },
} satisfies ExportedHandler<Env>;
