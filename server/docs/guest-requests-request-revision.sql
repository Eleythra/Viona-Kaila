-- =========================================================
-- VIONA / KAILA - REQUEST FORM REVISION (REQUEST BUCKET)
-- =========================================================
-- Purpose:
-- 1) Add single-category field for request records
-- 2) Add category-specific detail payload for request records
-- 3) Keep compatibility with existing rows

alter table if exists guest_requests
  add column if not exists category text;

alter table if exists guest_requests
  add column if not exists details jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_requests_category_chk'
  ) then
    alter table guest_requests
      add constraint guest_requests_category_chk
      check (
        category is null
        or category in (
          'towel',
          'bedding',
          'room_cleaning',
          'minibar',
          'baby_equipment',
          'room_equipment',
          'other'
        )
      );
  end if;
end $$;

create index if not exists idx_guest_requests_category
  on guest_requests (category);

create index if not exists idx_guest_requests_status_submitted_at
  on guest_requests (status, submitted_at desc);

-- Optional backfill: use first legacy category as category
-- (safe for old multi-select rows; keeps historical data queryable)
update guest_requests
set category = coalesce(category, (categories->>0))
where category is null
  and categories is not null
  and jsonb_typeof(categories) = 'array'
  and jsonb_array_length(categories) > 0;
