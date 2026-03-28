-- =========================================================
-- VIONA / KAILA - GUEST FORMS FINAL REVISION (REQUEST + FAULT + RESERVATION)
-- Safe to run multiple times
-- =========================================================

-- -----------------------------
-- 1) REQUEST TABLE REVISION
-- -----------------------------
alter table if exists guest_requests
  add column if not exists category text;

alter table if exists guest_requests
  add column if not exists details jsonb not null default '{}'::jsonb;

do $$
begin
  -- Legacy request categories are temporarily accepted for backward compatibility.
  if not exists (select 1 from pg_constraint where conname = 'guest_requests_category_chk') then
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
          'other',
          'extraTowels',
          'extra_towels',
          'towels',
          'linen',
          'roomCleaning',
          'room_cleaning_request',
          'minibarRefill',
          'minibar_request',
          'babyNeeds',
          'baby_equipment_request',
          'roomSupplies',
          'room_equipment_request',
          'otherRequest'
        )
      );
  end if;
end $$;

create index if not exists idx_guest_requests_category
  on guest_requests (category);

create index if not exists idx_guest_requests_status_submitted_at
  on guest_requests (status, submitted_at desc);

update guest_requests
set category = coalesce(category, (categories->>0))
where category is null
  and categories is not null
  and jsonb_typeof(categories) = 'array'
  and jsonb_array_length(categories) > 0;

-- Normalize legacy request categories into new canonical set
update guest_requests
set category = case
  when category in ('extraTowels', 'extra_towels', 'towels') then 'towel'
  when category in ('linen') then 'bedding'
  when category in ('roomCleaning', 'room_cleaning_request') then 'room_cleaning'
  when category in ('minibarRefill', 'minibar_request') then 'minibar'
  when category in ('babyNeeds', 'baby_equipment_request') then 'baby_equipment'
  when category in ('roomSupplies', 'room_equipment_request') then 'room_equipment'
  when category in ('otherRequest') then 'other'
  else category
end
where category is not null;

-- -----------------------------
-- 2) FAULT TABLE REVISION
-- -----------------------------
alter table if exists guest_faults
  add column if not exists category text;

alter table if exists guest_faults
  add column if not exists location text;

alter table if exists guest_faults
  add column if not exists urgency text;

alter table if exists guest_faults
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table if exists guest_faults
  drop constraint if exists guest_faults_category_chk;

do $$
begin
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
        'other',
        -- legacy compatibility
        'ac',
        'klima',
        'heating',
        'electric_issue',
        'electricity',
        'water',
        'bathroom',
        'tv',
        'electronics',
        'door',
        'lock',
        'furniture',
        'cleaning_damage',
        'balcony',
        'window',
        'otherFault'
      )
    );

  if not exists (select 1 from pg_constraint where conname = 'guest_faults_location_chk') then
    alter table guest_faults
      add constraint guest_faults_location_chk
      check (
        location is null
        or location in ('room_inside', 'bathroom', 'balcony', 'other')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'guest_faults_urgency_chk') then
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

update guest_faults
set category = coalesce(category, (categories->>0))
where category is null
  and categories is not null
  and jsonb_typeof(categories) = 'array'
  and jsonb_array_length(categories) > 0;

-- Normalize legacy fault categories into new canonical set
update guest_faults
set category = case
  when category in ('ac', 'klima', 'heating') then 'hvac'
  when category in ('electric_issue', 'electricity') then 'electric'
  when category in ('water', 'bathroom') then 'water_bathroom'
  when category in ('tv', 'electronics') then 'tv_electronics'
  when category in ('door', 'lock') then 'door_lock'
  when category in ('furniture') then 'furniture_item'
  when category in ('cleaning_damage') then 'cleaning_equipment_damage'
  when category in ('balcony', 'window') then 'balcony_window'
  when category in ('otherFault') then 'other'
  else category
end
where category is not null;

-- -----------------------------
-- 3) RESERVATION TABLE REVISION
-- -----------------------------
alter table if exists guest_reservations
  add column if not exists language text;

alter table if exists guest_reservations
  add column if not exists service_code text;

alter table if exists guest_reservations
  add column if not exists service_label text;

alter table if exists guest_reservations
  add column if not exists reservation_date date;

alter table if exists guest_reservations
  add column if not exists reservation_time text;

alter table if exists guest_reservations
  add column if not exists guest_count integer;

alter table if exists guest_reservations
  add column if not exists description text;

alter table if exists guest_reservations
  add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'guest_reservations_type_chk') then
    alter table guest_reservations
      add constraint guest_reservations_type_chk
      check (reservation_type in ('reservation_alacarte', 'reservation_spa'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'guest_reservations_guest_count_chk') then
    alter table guest_reservations
      add constraint guest_reservations_guest_count_chk
      check (guest_count is null or guest_count >= 1);
  end if;
end $$;

create index if not exists idx_guest_reservations_type_date_time
  on guest_reservations (reservation_type, reservation_date, reservation_time);

create index if not exists idx_guest_reservations_status_submitted
  on guest_reservations (status, submitted_at desc);

create index if not exists idx_guest_reservations_service_code
  on guest_reservations (service_code);

create index if not exists idx_guest_reservations_room_number
  on guest_reservations (room_number);

update guest_reservations
set
  language = coalesce(language, nullif(raw_payload->>'language', '')),
  service_code = coalesce(
    service_code,
    nullif(reservation_data->>'serviceCode', ''),
    nullif(reservation_data->>'restaurantCode', ''),
    nullif(reservation_data->>'restaurantId', ''),
    nullif(reservation_data->>'spaServiceId', '')
  ),
  service_label = coalesce(service_label, nullif(reservation_data->>'serviceLabel', '')),
  reservation_date = coalesce(
    reservation_date,
    nullif(reservation_data->>'reservationDate', '')::date,
    nullif(reservation_data->>'date', '')::date
  ),
  reservation_time = coalesce(reservation_time, nullif(reservation_data->>'time', '')),
  guest_count = coalesce(
    guest_count,
    nullif(reservation_data->>'guestCount', '')::integer,
    nullif(raw_payload->>'guestCount', '')::integer
  ),
  description = coalesce(description, note),
  updated_at = coalesce(updated_at, submitted_at, now())
where true;
