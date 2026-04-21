-- Rich restaurant content snapshot imported from DoorDash via the admin bookmarklet.
-- See docs/requirements/doordash-import.md for the payload shape.
--
-- null    = manually-entered restaurant (no import), renders like before.
-- non-null = typed RichContent snapshot (version-stamped, source-tagged).

alter table restaurants add column rich_content jsonb;
