-- Server-side billing and generations for the Worker backend.
-- Users can read their own rows; every write goes through the Worker (service role) and the functions below,
-- so balances can't be edited from the browser.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free', 'basic', 'plus', 'ultra')),
  credits numeric(12, 1) not null default 0 check (credits >= 0),
  free_generations int not null default 3 check (free_generations >= 0),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  delta numeric(12, 1) not null,
  balance_after numeric(12, 1) not null,
  reason text not null check (reason in ('plan-grant', 'generation', 'refund', 'top-up')),
  generation_id text,
  note text not null default '',
  idempotency_key text unique
);
create index credit_ledger_user_at on public.credit_ledger (user_id, at desc);

create table public.generations (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('generate', 'upscale', 'extend', 'reframe', 'lipsync')),
  parent_id text,
  remix_of text,
  params jsonb not null,
  mode text not null check (mode in ('video', 'image')),
  provider text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  cost numeric(12, 1) not null default 0,
  free_tier boolean not null default false,
  unlimited boolean not null default false,
  refunded boolean not null default false,
  watermark boolean not null default false,
  favorite boolean not null default false,
  duration_ms int not null,
  vendor_task_id text,
  error text,
  output jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index generations_user_updated on public.generations (user_id, updated_at desc);
create index generations_user_active on public.generations (user_id, status) where status in ('queued', 'processing');

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generations enable row level security;
alter table public.stripe_events enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own ledger" on public.credit_ledger for select using (auth.uid() = user_id);
create policy "own generations" on public.generations for select using (auth.uid() = user_id and deleted_at is null);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger generations_touch before update on public.generations for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Locks and returns the caller's profile, creating it for accounts made before this migration.
create function public.lock_profile(p_user uuid) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v public.profiles;
begin
  insert into public.profiles (id) values (p_user) on conflict do nothing;
  select * into v from public.profiles where id = p_user for update;
  return v;
end $$;

create function public.plan_rank(p_plan text) returns int language sql immutable set search_path = public as $$
  select case p_plan when 'free' then 0 when 'basic' then 1 when 'plus' then 2 when 'ultra' then 3 else -1 end
$$;

-- Charges for a job and inserts it as queued, in one transaction. Replays with the same id return the existing row.
-- Payment order matches lib/pricing.ts quote(): unlimited lane, then credits, then a free-tier generation.
create function public.debit_for_generation(
  p_user uuid,
  p_id text,
  p_action text,
  p_parent_id text,
  p_remix_of text,
  p_params jsonb,
  p_mode text,
  p_provider text,
  p_cost numeric,
  p_min_plan text,
  p_unlimited_plans text[],
  p_unlimited_daily_cap int,
  p_free_allowed boolean,
  p_duration_ms int,
  p_note text
) returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles;
  v_gen public.generations;
  v_unlimited boolean := false;
  v_free boolean := false;
  v_charge numeric := 0;
begin
  v_profile := public.lock_profile(p_user);

  select * into v_gen from public.generations where id = p_id;
  if found then
    if v_gen.user_id <> p_user then raise exception 'id_conflict'; end if;
    return v_gen;
  end if;

  if public.plan_rank(v_profile.plan_id) < public.plan_rank(p_min_plan) then
    raise exception 'plan_required:%', p_min_plan;
  end if;

  if p_action = 'generate' and v_profile.plan_id = any (p_unlimited_plans) and (
    select count(*) from public.generations
    where user_id = p_user and unlimited and created_at > now() - interval '1 day'
  ) < p_unlimited_daily_cap then
    v_unlimited := true;
  elsif v_profile.credits >= p_cost then
    v_charge := p_cost;
  elsif p_free_allowed and v_profile.plan_id = 'free' and v_profile.free_generations > 0 then
    v_free := true;
  else
    raise exception 'insufficient_credits:%', p_cost - v_profile.credits;
  end if;

  insert into public.generations (
    id, user_id, action, parent_id, remix_of, params, mode, provider, cost, free_tier, unlimited, watermark, duration_ms
  ) values (
    p_id, p_user, p_action, p_parent_id, p_remix_of, p_params, p_mode, p_provider, v_charge, v_free, v_unlimited,
    v_profile.plan_id = 'free', p_duration_ms
  ) returning * into v_gen;

  if v_free then
    update public.profiles set free_generations = free_generations - 1 where id = p_user;
  elsif v_charge > 0 then
    update public.profiles set credits = credits - v_charge where id = p_user returning * into v_profile;
    insert into public.credit_ledger (user_id, delta, balance_after, reason, generation_id, note, idempotency_key)
    values (p_user, -v_charge, v_profile.credits, 'generation', p_id, p_note, 'debit:' || p_id);
  end if;

  return v_gen;
end $$;

-- Gives back whatever a failed or cancelled-before-start job paid. Safe to call more than once.
create function public.refund_generation(p_id text, p_note text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
  v_profile public.profiles;
begin
  select * into v_gen from public.generations where id = p_id;
  if not found then return false; end if;
  perform public.lock_profile(v_gen.user_id);
  select * into v_gen from public.generations where id = p_id for update;
  if v_gen.refunded or v_gen.status not in ('failed', 'cancelled') then return false; end if;

  if v_gen.free_tier then
    update public.profiles set free_generations = least(3, free_generations + 1) where id = v_gen.user_id;
  elsif v_gen.cost > 0 then
    update public.profiles set credits = credits + v_gen.cost where id = v_gen.user_id returning * into v_profile;
    insert into public.credit_ledger (user_id, delta, balance_after, reason, generation_id, note, idempotency_key)
    values (v_gen.user_id, v_gen.cost, v_profile.credits, 'refund', p_id, p_note, 'refund:' || p_id);
  end if;
  update public.generations set refunded = true where id = p_id;
  return true;
end $$;

-- Adds credits (plan renewals, packs). Returns false if this idempotency key was already applied.
create function public.grant_credits(p_user uuid, p_delta numeric, p_reason text, p_note text, p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  perform public.lock_profile(p_user);
  if exists (select 1 from public.credit_ledger where idempotency_key = p_key) then return false; end if;
  update public.profiles set credits = credits + p_delta where id = p_user returning * into v_profile;
  insert into public.credit_ledger (user_id, delta, balance_after, reason, note, idempotency_key)
  values (p_user, p_delta, v_profile.credits, p_reason, p_note, p_key);
  return true;
end $$;

-- Moves a queued job to processing if the user has a free slot and it's first in its lane.
-- Paid jobs share the plan's concurrency; unlimited jobs get one slot per mode. Returns the job's status afterwards.
create function public.claim_slot(p_id text, p_concurrency jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
  v_profile public.profiles;
  v_limit int;
begin
  select * into v_gen from public.generations where id = p_id;
  if not found then return 'missing'; end if;
  v_profile := public.lock_profile(v_gen.user_id);
  select * into v_gen from public.generations where id = p_id;
  if v_gen.status <> 'queued' then return v_gen.status; end if;

  if exists (
    select 1 from public.generations
    where user_id = v_gen.user_id and status = 'queued' and unlimited = v_gen.unlimited
      and (not v_gen.unlimited or mode = v_gen.mode) and created_at < v_gen.created_at
  ) then
    return 'queued';
  end if;

  if v_gen.unlimited then
    if exists (select 1 from public.generations where user_id = v_gen.user_id and status = 'processing' and unlimited and mode = v_gen.mode) then
      return 'queued';
    end if;
  else
    v_limit := coalesce((p_concurrency ->> v_profile.plan_id)::int, 1);
    if (select count(*) from public.generations where user_id = v_gen.user_id and status = 'processing' and not unlimited) >= v_limit then
      return 'queued';
    end if;
  end if;

  update public.generations set status = 'processing', started_at = now() where id = p_id;
  return 'processing';
end $$;

-- Records the outcome of a processing job and refunds failures. Ignores jobs that were cancelled meanwhile.
create function public.finish_generation(p_id text, p_status text, p_output jsonb, p_error text) returns public.generations
language plpgsql security definer set search_path = public as $$
declare v_gen public.generations;
begin
  if p_status not in ('completed', 'failed') then raise exception 'bad_status'; end if;
  update public.generations
  set status = p_status, output = p_output, error = p_error, finished_at = now()
  where id = p_id and status = 'processing'
  returning * into v_gen;
  if found and p_status = 'failed' then
    perform public.refund_generation(p_id, 'Generation failed — refund');
    select * into v_gen from public.generations where id = p_id;
  end if;
  return v_gen;
end $$;

-- Cancels a job. Queued jobs are refunded; jobs already rendering are not. Returns the status before cancelling.
create function public.cancel_generation(p_user uuid, p_id text) returns text
language plpgsql security definer set search_path = public as $$
declare v_prev text;
begin
  perform public.lock_profile(p_user);
  select status into v_prev from public.generations where id = p_id and user_id = p_user for update;
  if not found or v_prev not in ('queued', 'processing') then return coalesce(v_prev, 'missing'); end if;
  update public.generations set status = 'cancelled', finished_at = now() where id = p_id;
  if v_prev = 'queued' then perform public.refund_generation(p_id, 'Cancelled before start — refund'); end if;
  return v_prev;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function
  public.lock_profile(uuid),
  public.debit_for_generation(uuid, text, text, text, text, jsonb, text, text, numeric, text, text[], int, boolean, int, text),
  public.refund_generation(text, text),
  public.grant_credits(uuid, numeric, text, text, text),
  public.claim_slot(text, jsonb),
  public.finish_generation(text, text, jsonb, text),
  public.cancel_generation(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.lock_profile(uuid),
  public.debit_for_generation(uuid, text, text, text, text, jsonb, text, text, numeric, text, text[], int, boolean, int, text),
  public.refund_generation(text, text),
  public.grant_credits(uuid, numeric, text, text, text),
  public.claim_slot(text, jsonb),
  public.finish_generation(text, text, jsonb, text),
  public.cancel_generation(uuid, text)
to service_role;
