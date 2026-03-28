-- =========================================================
-- VIONA / KAILA - FAULT FORM REVISION (FAULT BUCKET)
-- =========================================================
-- Purpose:
-- 1) Add single-category field for fault records
-- 2) Add location + urgency fields for operational routing
-- 3) Keep compatibility with existing rows

alter table if exists guest_faults
  add column if not exists category text;

alter table if exists guest_faults
  add column if not exists location text;

alter table if exists guest_faults
  add column if not exists urgency text;

alter table if exists guest_faults
  add column if not exists details jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guest_faults_category_chk'
  ) then
    alter table guest_faults
      add constraint guest_faults_category_chk
      check (
        category is null
        or category in (
          'hvac',
          'electric',
          'water_bathroom',
          'tv_electronics',
          'door_lock',
          'furniture_item',
          'cleaning_equipment_damage',
          'balcony_window',
          'other'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'guest_faults_location_chk'
  ) then
    alter table guest_faults
      add constraint guest_faults_location_chk
      check (
        location is null
        or location in ('room_inside', 'bathroom', 'balcony', 'other')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'guest_faults_urgency_chk'
  ) then
    alter table guest_faults
      add constraint guest_faults_urgency_chk
      check (
        urgency is null
        or urgency in ('normal', 'urgent')
      );
  end if;
end $$;

create index if not exists idx_guest_faults_category
  on guest_faults (category);

create index if not exists idx_guest_faults_urgency
  on guest_faults (urgency);

create index if not exists idx_guest_faults_status_submitted_at
  on guest_faults (status, submitted_at desc);

-- Optional backfill: take first legacy category as category
update guest_faults
set category = coalesce(category, (categories->>0))
where category is null
  and categories is not null
  and jsonb_typeof(categories) = 'array'
  and jsonb_array_length(categories) > 0;
