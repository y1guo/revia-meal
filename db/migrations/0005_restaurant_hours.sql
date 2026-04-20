-- Per-restaurant weekly open schedule. Rows represent open days.
-- See docs/requirements/restaurant-open-hours.md.
--
-- Convention:
--   - Row exists  = restaurant is open on that day_of_week.
--                   opens_at / closes_at optional; both null = "open all day".
--   - Row absent  = restaurant is closed on that day_of_week.
--   - Zero rows   = "unconfigured" sentinel; treated as open every day
--                   (backwards-compat for existing restaurants).
--
-- day_of_week uses ISO-8601 (Monday = 1 … Sunday = 7), matching
-- lib/polls.ts::getDayOfWeekISO and poll_templates.schedule.days_of_week.

create table restaurant_hours (
    restaurant_id uuid not null references restaurants(id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 1 and 7),
    opens_at time,
    closes_at time,
    primary key (restaurant_id, day_of_week)
);
