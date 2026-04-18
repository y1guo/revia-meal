-- Initial schema for revia-meal.
-- See docs/data-model.md for the design rationale behind each table.

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- users
-- ============================================================================
create table users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    display_name text,
    role text not null default 'user' check (role in ('user', 'admin')),
    is_active boolean not null default true,
    supabase_auth_id uuid unique,
    created_at timestamptz not null default now()
);

-- ============================================================================
-- restaurants
-- ============================================================================
create table restaurants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    doordash_url text,
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ============================================================================
-- poll_templates
-- ============================================================================
create table poll_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    schedule jsonb not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ============================================================================
-- template_restaurants
-- Carries the rolling-credit balance per (template, restaurant).
-- ============================================================================
create table template_restaurants (
    template_id uuid not null references poll_templates(id) on delete cascade,
    restaurant_id uuid not null references restaurants(id) on delete restrict,
    accumulated_credits numeric not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    primary key (template_id, restaurant_id)
);

-- ============================================================================
-- polls
-- One instance of a template for a given local date.
-- ============================================================================
create table polls (
    id uuid primary key default gen_random_uuid(),
    template_id uuid not null references poll_templates(id) on delete restrict,
    scheduled_date date not null,
    opens_at timestamptz not null,
    closes_at timestamptz not null,
    finalized_at timestamptz,
    cancelled_at timestamptz,
    cancellation_reason text check (cancellation_reason in ('no_votes', 'admin')),
    cancelled_by uuid references users(id) on delete set null,
    winner_id uuid references restaurants(id) on delete restrict,
    created_at timestamptz not null default now(),
    check (finalized_at is null or cancelled_at is null),
    check ((cancellation_reason is null) = (cancelled_at is null)),
    check (closes_at > opens_at)
);

-- One active (non-cancelled) poll per (template, date).
create unique index polls_template_date_active_uidx
    on polls (template_id, scheduled_date)
    where cancelled_at is null;

-- ============================================================================
-- poll_options
-- Snapshot of the ballot for a specific poll.
-- ============================================================================
create table poll_options (
    poll_id uuid not null references polls(id) on delete cascade,
    restaurant_id uuid not null references restaurants(id) on delete restrict,
    primary key (poll_id, restaurant_id)
);

-- ============================================================================
-- votes
-- One row per (user, poll, restaurant) selection. Users edit picks by
-- adding/removing rows during the open window.
-- ============================================================================
create table votes (
    poll_id uuid not null references polls(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    restaurant_id uuid not null references restaurants(id) on delete restrict,
    scheduled_date date not null,
    created_at timestamptz not null default now(),
    primary key (poll_id, user_id, restaurant_id)
);

create index votes_user_scheduled_date_idx on votes (user_id, scheduled_date);

-- ============================================================================
-- daily_participation
-- Locks a user to one template's poll per local date.
-- ============================================================================
create table daily_participation (
    user_id uuid not null references users(id) on delete cascade,
    scheduled_date date not null,
    template_id uuid not null references poll_templates(id) on delete restrict,
    first_voted_at timestamptz not null default now(),
    primary key (user_id, scheduled_date)
);

-- ============================================================================
-- restaurant_credit_events
-- Append-only audit log of every accumulated-credit movement.
-- ============================================================================
create table restaurant_credit_events (
    id uuid primary key default gen_random_uuid(),
    seq bigserial not null unique,
    template_id uuid not null references poll_templates(id) on delete restrict,
    restaurant_id uuid not null references restaurants(id) on delete restrict,
    poll_id uuid references polls(id) on delete set null,
    delta numeric not null,
    reason text not null check (reason in (
        'poll_accumulation',
        'winner_reset',
        'admin_adjustment',
        'decay'
    )),
    created_at timestamptz not null default now()
);

create index rce_template_restaurant_idx
    on restaurant_credit_events (template_id, restaurant_id, seq);

-- ============================================================================
-- api_keys
-- Per-user bearer tokens. Permissions follow the owning user's current role.
-- ============================================================================
create table api_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    token_hash text not null unique,
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index api_keys_user_idx on api_keys (user_id);
