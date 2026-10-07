import Stripe from "stripe";
import { CREDIT_PACKS, PLAN_BY_ID } from "@/lib/catalog/plans";
import type { PlanId } from "@/lib/types";
import { db, getProfile, must } from "../db";
import { ApiError, json, readJson } from "../http";

type PaidPlan = Exclude<PlanId, "free">;

let client: { key: string; stripe: Stripe } | null = null;
function stripe(env: Env) {
  if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, "billing_off", "Payments are not configured");
  if (client?.key !== env.STRIPE_SECRET_KEY) {
    client = { key: env.STRIPE_SECRET_KEY, stripe: new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() }) };
  }
  return client.stripe;
}

const priceIds = (env: Env): Record<PaidPlan, string> => ({ basic: env.STRIPE_PRICE_BASIC, plus: env.STRIPE_PRICE_PLUS, ultra: env.STRIPE_PRICE_ULTRA });

export const isStripeConfigured = (env: Env) => Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && Object.values(priceIds(env)).every(Boolean));

function planForSubscription(env: Env, sub: Stripe.Subscription): PaidPlan | null {
  const price = sub.items.data[0]?.price.id;
  const byPrice = (Object.entries(priceIds(env)) as [PaidPlan, string][]).find(([, id]) => id === price)?.[0];
  return byPrice ?? ((sub.metadata.planId as PaidPlan) in PLAN_BY_ID ? (sub.metadata.planId as PaidPlan) : null);
}

async function customerFor(env: Env, userId: string) {
  const profile = await getProfile(env, userId);
  if (profile.stripe_customer_id) return { customer: profile.stripe_customer_id, profile };
  const { data } = await db(env).auth.admin.getUserById(userId);
  const customer = await stripe(env).customers.create({ email: data.user?.email, metadata: { userId } });
  must(await db(env).from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId), "save customer");
  return { customer: customer.id, profile };
}

/** Where Stripe sends the user back: the page's own origin when it's ours (incl. `next dev`), else the Worker's. */
function returnOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const self = new URL(request.url).origin;
  return origin && (origin === self || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) ? origin : self;
}

async function portalUrl(env: Env, customer: string, returnUrl: string) {
  const session = await stripe(env).billingPortal.sessions.create({ customer, return_url: returnUrl });
  return session.url;
}

export async function createCheckout(request: Request, env: Env, userId: string) {
  const body = await readJson<{ kind: "plan"; planId: PlanId } | { kind: "pack"; packId: string }>(request);
  const back = `${returnOrigin(request)}/pricing/`;
  const { customer, profile } = await customerFor(env, userId);

  if (body.kind === "plan") {
    if (body.planId === "free" || !(body.planId in PLAN_BY_ID)) throw new ApiError(400, "bad_plan", "Choose a paid plan");
    // Plan changes on an existing subscription happen in the portal so Stripe handles proration.
    if (profile.stripe_subscription_id) return json({ url: await portalUrl(env, customer, back) });
    const session = await stripe(env).checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: userId,
      line_items: [{ price: priceIds(env)[body.planId], quantity: 1 }],
      subscription_data: { metadata: { userId, planId: body.planId } },
      metadata: { userId, planId: body.planId },
      success_url: `${back}?checkout=success`,
      cancel_url: `${back}?checkout=cancelled`,
    });
    return json({ url: session.url });
  }

  const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
  if (!pack) throw new ApiError(400, "bad_pack", "Unknown credit pack");
  const session = await stripe(env).checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: userId,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(pack.price * 100), product_data: { name: `${pack.credits.toLocaleString("en-US")} credits` } } }],
    metadata: { userId, packId: pack.id },
    success_url: `${back}?checkout=success`,
    cancel_url: `${back}?checkout=cancelled`,
  });
  return json({ url: session.url });
}

export async function createPortal(request: Request, env: Env, userId: string) {
  const profile = await getProfile(env, userId);
  if (!profile.stripe_customer_id) throw new ApiError(400, "no_customer", "No billing account yet");
  return json({ url: await portalUrl(env, profile.stripe_customer_id, `${returnOrigin(request)}/pricing/`) });
}

async function userForCustomer(env: Env, customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, fallback?: string) {
  if (fallback) return fallback;
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return null;
  const rows = must(await db(env).from("profiles").select("id").eq("stripe_customer_id", id).limit(1), "profile by customer") as { id: string }[];
  return rows[0]?.id ?? null;
}

async function setPlan(env: Env, userId: string, planId: PlanId, subscriptionId: string | null) {
  must(await db(env).from("profiles").update({ plan_id: planId, stripe_subscription_id: subscriptionId }).eq("id", userId), "set plan");
}

async function handleEvent(env: Env, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = await userForCustomer(env, session.customer, session.metadata?.userId ?? session.client_reference_id ?? undefined);
      if (!userId) return;
      if (session.mode === "payment" && session.payment_status === "paid") {
        const pack = CREDIT_PACKS.find((p) => p.id === session.metadata?.packId);
        if (pack) {
          must(
            await db(env).rpc("grant_credits", { p_user: userId, p_delta: pack.credits, p_reason: "top-up", p_note: `${pack.credits} credit pack`, p_key: `checkout:${session.id}` }),
            "grant pack",
          );
        }
      }
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        must(await db(env).from("profiles").update({ stripe_subscription_id: session.subscription }).eq("id", userId), "save subscription");
      }
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const ref = invoice.parent?.subscription_details?.subscription;
      if (!ref) return;
      const sub = typeof ref === "string" ? await stripe(env).subscriptions.retrieve(ref) : ref;
      const userId = await userForCustomer(env, invoice.customer, sub.metadata.userId);
      const planId = planForSubscription(env, sub);
      if (!userId || !planId) return;
      await setPlan(env, userId, planId, sub.id);
      const plan = PLAN_BY_ID[planId];
      must(
        await db(env).rpc("grant_credits", { p_user: userId, p_delta: plan.credits, p_reason: "plan-grant", p_note: `${plan.name} monthly credits`, p_key: `invoice:${invoice.id}` }),
        "grant plan",
      );
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await userForCustomer(env, sub.customer, sub.metadata.userId);
      if (!userId) return;
      const ended = event.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);
      if (ended) return setPlan(env, userId, "free", null);
      const planId = planForSubscription(env, sub);
      if (planId && (sub.status === "active" || sub.status === "trialing")) await setPlan(env, userId, planId, sub.id);
      return;
    }
  }
}

/** Stripe retries until we return 2xx; already-processed event ids are acknowledged without re-running. */
export async function stripeWebhook(request: Request, env: Env) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) throw new ApiError(400, "bad_signature", "Missing signature");
  let event: Stripe.Event;
  try {
    event = await stripe(env).webhooks.constructEventAsync(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    throw new ApiError(400, "bad_signature", "Invalid signature");
  }

  const seen = must(await db(env).from("stripe_events").select("id").eq("id", event.id).limit(1), "stripe_events") as unknown[];
  if (seen.length) return json({ received: true, duplicate: true });

  await handleEvent(env, event);
  await db(env).from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  console.log(JSON.stringify({ level: "info", msg: "stripe event", id: event.id, type: event.type }));
  return json({ received: true });
}
