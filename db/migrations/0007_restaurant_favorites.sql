-- Per-user restaurant favorites. One row per (user, restaurant) a user has starred.
--
-- Favorites are user-global, not poll- or template-scoped: a restaurant favorited
-- anywhere is the same favorite everywhere it appears on a ballot.
--
-- restaurant_id uses `on delete cascade` (unlike votes, which use `restrict` to
-- protect credit history) — a favorite carries no integrity/history need, and
-- restaurants are soft-deleted via is_active anyway.

create table restaurant_favorites (
    user_id uuid not null references users(id) on delete cascade,
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, restaurant_id)
);

create index restaurant_favorites_user_idx on restaurant_favorites (user_id);
