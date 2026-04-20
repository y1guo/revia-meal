-- Audit trail for admin-overridden poll winners. Each row records one
-- override event; polls.winner_id is updated in place to the latest
-- new_winner_id. Overrides are only permitted on finalized,
-- non-cancelled polls — enforced in application code, not here.
--
-- ON DELETE policies:
--   poll_id        -> cascade: overrides are orphans if the poll is
--                    hard-deleted. We never hard-delete polls in normal
--                    operation (cancel is soft), but this is defensive.
--   overridden_by  -> set null, matching polls.cancelled_by. Keeps the
--                    audit row even after the admin is removed.
--   old/new_winner -> restrict: the referenced restaurants must survive
--                    so the history remains readable.

create table poll_overrides (
    id             uuid primary key default gen_random_uuid(),
    poll_id        uuid not null references polls(id) on delete cascade,
    overridden_at  timestamptz not null default now(),
    overridden_by  uuid references users(id) on delete set null,
    old_winner_id  uuid not null references restaurants(id) on delete restrict,
    new_winner_id  uuid not null references restaurants(id) on delete restrict,
    reason         text
);

create index poll_overrides_poll_idx
    on poll_overrides (poll_id, overridden_at desc);
