-- =========================================================
-- VIONA / KAILA - RESERVATION REVISION (A LA CARTE + SPA)
-- =========================================================
-- Adds operational columns for admin listing/filtering without
-- breaking existing reservation_data/raw_payload compatibility.

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
      check (
        reservation_type in ('reservation_alacarte', 'reservation_spa')
      );
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

-- Backfill from existing JSON payload where possible
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
