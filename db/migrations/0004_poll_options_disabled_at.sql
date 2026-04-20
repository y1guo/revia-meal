-- Soft-delete flag for per-poll ballot entries. Admins can remove a
-- restaurant from an open poll without destroying existing votes:
-- disabled_at != null keeps the row visible to voters who already picked
-- it (so they can unvote) but excludes it from winner selection in
-- finalizePoll. See docs/requirements/poll-ballot-edit.md.
--
-- null  = active on the ballot
-- !null = soft-disabled at that timestamp

alter table poll_options
    add column disabled_at timestamptz;
