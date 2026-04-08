-- =============================================================================
-- VIONA / KAILA — Supabase SQL Editor’a TEK SEFERDE yapıştırın
-- Sıra: uzantı → chat_observations → CHECK’ler → indeksler → chat_logs backfill
--       → özet view’lar → şikâyet/arıza kolonları → 8a istek category CHECK → 8b kova status CHECK
--       → guest_reservations revizyonu
--       → rezervasyon status (rejected = admin “Onaylanmadı”) → guest_notifications → guest_late_checkouts (geç çıkış)
--
-- NOT: CHECK eklenirken "violates check constraint" alırsanız, aşağıdaki
--      "OPSİYONEL: CHECK öncesi veri temizliği" bölümünü sırayla çalıştırın.
-- Rezervasyon status: bölüm 9 sonunda CHECK her çalıştırmada drop+add ile güncellenir
-- (eski ‘rejected’siz kısıt kalmaz). CHECK eklenemezse aşağıdaki OPSİYONEL veri notuna bakın.
-- Node (service_role) RLS’i baypas eder; yalnızca anon key ile doğrudan yazım
-- yapacaksanız RLS politikalarını ayrıca tanımlamanız gerekir.
-- Dağıtım, Render, Telegram, PDF: server/docs/deploy-and-operations-report.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Uzantı (gen_random_uuid)
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) chat_observations — tablo (yoksa oluşturur)
-- -----------------------------------------------------------------------------
create table if not exists public.chat_observations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  session_id text,
  user_id text,
  user_message text not null,
  ui_language text,
  detected_language text,

  intent text,
  domain text,
  sub_intent text,
  entity text,
  confidence numeric(5,4),
  multi_intent boolean not null default false,

  response_type text,
  route_target text,
  recommendation_made boolean not null default false,
  layer_used text,
  fallback_reason text,
  decision_path text,

  assistant_response text not null,

  is_correct boolean,
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,

  raw_payload jsonb not null default '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 2) Eski kurulum: tablo vardı ama kolonlar eksikse tamamlar (idempotent)
-- -----------------------------------------------------------------------------
alter table if exists public.chat_observations
  add column if not exists created_at timestamptz default now(),
  add column if not exists session_id text,
  add column if not exists user_id text,
  add column if not exists user_message text,
  add column if not exists ui_language text,
  add column if not exists detected_language text,
  add column if not exists intent text,
  add column if not exists domain text,
  add column if not exists sub_intent text,
  add column if not exists entity text,
  add column if not exists confidence numeric(5,4),
  add column if not exists multi_intent boolean default false,
  add column if not exists response_type text,
  add column if not exists route_target text,
  add column if not exists recommendation_made boolean default false,
  add column if not exists layer_used text,
  add column if not exists fallback_reason text,
  add column if not exists decision_path text,
  add column if not exists assistant_response text,
  add column if not exists is_correct boolean,
  add column if not exists review_note text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists raw_payload jsonb default '{}'::jsonb;

-- NOT NULL / default backfill (yeni eklenen kolonlar boş kaldıysa)
update public.chat_observations
set
  user_message = coalesce(nullif(trim(user_message), ''), '[legacy:empty]'),
  assistant_response = coalesce(nullif(trim(assistant_response), ''), ' '),
  multi_intent = coalesce(multi_intent, false),
  recommendation_made = coalesce(recommendation_made, false),
  raw_payload = coalesce(raw_payload, '{}'::jsonb)
where true;

-- CREATE ile aynı NOT NULL beklentisi (null kaldıysa önce üstteki UPDATE’i kontrol edin)
alter table public.chat_observations alter column user_message set not null;
alter table public.chat_observations alter column assistant_response set not null;
alter table public.chat_observations alter column multi_intent set not null;
alter table public.chat_observations alter column recommendation_made set not null;
alter table public.chat_observations alter column raw_payload set not null;

-- -----------------------------------------------------------------------------
-- 3) OPSİYONEL: CHECK eklemeden önce kırık satırları düzelt (hata alırsanız)
--     Bu üç satırı tek tek veya blok halinde çalıştırın; sonra bölüm 4’e geçin.
-- -----------------------------------------------------------------------------
-- update public.chat_observations
--   set response_type = null
--   where response_type is not null
--     and response_type not in ('answer','redirect','inform','fallback');
--
-- update public.chat_observations
--   set layer_used = null
--   where layer_used is not null
--     and layer_used not in ('rule','rag','llm','fallback');
--
-- update public.chat_observations
--   set user_message = '[legacy:empty]'
--   where trim(coalesce(user_message, '')) = '';

-- -----------------------------------------------------------------------------
-- 4) CHECK kısıtları (yoksa ekler) — yalnızca public.chat_observations üzerinde
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'chat_observations'
      and c.conname = 'chat_obs_response_type_chk'
  ) then
    alter table public.chat_observations
      add constraint chat_obs_response_type_chk
      check (response_type in ('answer','redirect','inform','fallback') or response_type is null);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'chat_observations'
      and c.conname = 'chat_obs_layer_used_chk'
  ) then
    alter table public.chat_observations
      add constraint chat_obs_layer_used_chk
      check (layer_used in ('rule','rag','llm','fallback') or layer_used is null);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'chat_observations'
      and c.conname = 'chat_obs_message_not_empty_chk'
  ) then
    alter table public.chat_observations
      add constraint chat_obs_message_not_empty_chk
      check (length(trim(user_message)) > 0);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5) İndeksler
-- -----------------------------------------------------------------------------
create index if not exists idx_chat_obs_created_at on public.chat_observations (created_at desc);
create index if not exists idx_chat_obs_session_id on public.chat_observations (session_id);
create index if not exists idx_chat_obs_user_id on public.chat_observations (user_id);
create index if not exists idx_chat_obs_intent on public.chat_observations (intent);
create index if not exists idx_chat_obs_domain on public.chat_observations (domain);
create index if not exists idx_chat_obs_layer_used on public.chat_observations (layer_used);
create index if not exists idx_chat_obs_response_type on public.chat_observations (response_type);
create index if not exists idx_chat_obs_multi_intent on public.chat_observations (multi_intent);
create index if not exists idx_chat_obs_is_correct on public.chat_observations (is_correct);

-- -----------------------------------------------------------------------------
-- 6) OPSİYONEL: chat_logs → chat_observations (tablo yoksa atlanır)
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.chat_logs') is not null then
    insert into public.chat_observations (
      created_at,
      session_id,
      user_id,
      user_message,
      ui_language,
      detected_language,
      intent,
      domain,
      sub_intent,
      entity,
      confidence,
      multi_intent,
      response_type,
      route_target,
      recommendation_made,
      layer_used,
      fallback_reason,
      decision_path,
      assistant_response,
      raw_payload
    )
    select
      cl.created_at,
      cl.session_id,
      null::text,
      trim(coalesce(cl.message, '')),
      cl.language,
      cl.language,
      coalesce(cl.intent, 'unknown'),
      case
        when cl.intent = 'recommendation' then 'recommendation'
        when cl.intent = 'fault_report' then 'room_and_maintenance'
        when cl.intent = 'complaint' then 'guest_relations'
        when cl.intent in ('request','reservation') then 'frontdesk_and_operations'
        when cl.intent = 'special_need' then 'allergy_and_diet'
        when cl.intent = 'chitchat' then 'social'
        else 'general_information'
      end,
      null::text,
      null::text,
      null::numeric,
      false,
      case
        when cl.used_fallback then 'fallback'
        when cl.intent in ('fault_report','request','reservation','complaint','special_need') then 'redirect'
        else 'answer'
      end,
      case
        when cl.intent in ('fault_report','request','reservation') then 'reception'
        when cl.intent in ('complaint','special_need') then 'guest_relations'
        else null
      end,
      (cl.intent = 'recommendation'),
      case when cl.used_fallback then 'fallback' else 'rule' end,
      null::text,
      'legacy_backfill:chat_logs',
      trim(coalesce(cl.response, '')),
      jsonb_build_object('legacy_chat_logs_id', cl.id)
    from public.chat_logs cl
    where trim(coalesce(cl.message, '')) <> ''
      and trim(coalesce(cl.response, '')) <> ''
      and not exists (
        select 1
        from public.chat_observations co
        where co.created_at = cl.created_at
          and co.session_id is not distinct from cl.session_id
          and co.user_message = trim(cl.message)
          and co.assistant_response = trim(cl.response)
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 7) Özet view’lar (rapor / PDF / dashboard)
-- -----------------------------------------------------------------------------
create or replace view public.v_chat_observations_weekly as
select
  date_trunc('week', created_at) as week_start,
  count(*) as total_messages,
  sum(case when layer_used = 'rule' then 1 else 0 end) as rule_count,
  sum(case when layer_used = 'rag' then 1 else 0 end) as rag_count,
  sum(case when layer_used = 'llm' then 1 else 0 end) as llm_count,
  sum(case when layer_used = 'fallback' then 1 else 0 end) as fallback_count,
  sum(case when recommendation_made then 1 else 0 end) as recommendation_count,
  sum(case when multi_intent then 1 else 0 end) as multi_intent_count,
  sum(case when is_correct is true then 1 else 0 end) as reviewed_correct_count,
  sum(case when is_correct is false then 1 else 0 end) as reviewed_wrong_count
from public.chat_observations
group by 1
order by 1 desc;

create or replace view public.v_chat_observations_monthly as
select
  date_trunc('month', created_at) as month_start,
  count(*) as total_messages,
  sum(case when layer_used = 'rule' then 1 else 0 end) as rule_count,
  sum(case when layer_used = 'rag' then 1 else 0 end) as rag_count,
  sum(case when layer_used = 'llm' then 1 else 0 end) as llm_count,
  sum(case when layer_used = 'fallback' then 1 else 0 end) as fallback_count,
  sum(case when recommendation_made then 1 else 0 end) as recommendation_count,
  sum(case when multi_intent then 1 else 0 end) as multi_intent_count,
  sum(case when is_correct is true then 1 else 0 end) as reviewed_correct_count,
  sum(case when is_correct is false then 1 else 0 end) as reviewed_wrong_count
from public.chat_observations
group by 1
order by 1 desc;

-- -----------------------------------------------------------------------------
-- 8) İstek / şikâyet / arıza — category + details (guest API ile uyumlu)
--     Tablo yoksa PostgreSQL "skipping" NOTICE verir, hata vermez (IF EXISTS).
-- -----------------------------------------------------------------------------
alter table if exists public.guest_requests
  add column if not exists category text;

alter table if exists public.guest_requests
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table if exists public.guest_complaints
  add column if not exists category text;

alter table if exists public.guest_complaints
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table if exists public.guest_faults
  add column if not exists category text;

alter table if exists public.guest_faults
  add column if not exists details jsonb not null default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- 8a) guest_requests — category CHECK (guest-requests.service.js REQUEST_CATEGORIES)
--     Eski SQL’deki dar liste (yalnızca towel, bedding, …) room_towel / bedding_pillow vb.
--     gönderiminde "violates check constraint guest_requests_category_chk" üretir.
--     Her yapıştırmada drop+add ile güncellenir (idempotent).
--     CHECK başarısız olursa: önce tabloda izin verilmeyen category stringleri düzeltin (aşağı OPSİYONEL).
-- -----------------------------------------------------------------------------
alter table if exists public.guest_requests drop constraint if exists guest_requests_category_chk;

alter table if exists public.guest_requests
  add constraint guest_requests_category_chk
  check (
    category is null
    or category in (
      'towel_extra',
      'room_towel',
      'bathrobe',
      'bedding_sheet',
      'bedding_pillow',
      'bedding_blanket',
      'room_cleaning',
      'turndown',
      'slippers',
      'minibar_refill',
      'bottled_water',
      'tea_coffee',
      'toilet_paper',
      'toiletries',
      'climate_request',
      'room_refresh',
      'hanger',
      'kettle',
      'room_safe',
      'baby_bed',
      'other',
      'towel',
      'bedding',
      'minibar',
      'baby_equipment',
      'room_equipment',
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

-- OPSİYONEL: 8a "violates check constraint" — guest_requests.category tabloda izin listesi dışındaysa:
-- update public.guest_requests set category = 'other'
-- where category is not null
--   and category not in (
--     'towel_extra','room_towel','bathrobe','bedding_sheet','bedding_pillow','bedding_blanket',
--     'room_cleaning','turndown','slippers','minibar_refill','bottled_water','tea_coffee',
--     'toilet_paper','toiletries','climate_request','room_refresh','hanger','kettle','room_safe',
--     'baby_bed','other','towel','bedding','minibar','baby_equipment','room_equipment',
--     'extraTowels','extra_towels','towels','linen','roomCleaning','room_cleaning_request',
--     'minibarRefill','minibar_request','babyNeeds','baby_equipment_request','roomSupplies',
--     'room_equipment_request','otherRequest'
--   );

-- -----------------------------------------------------------------------------
-- 8b) İstek / şikâyet / arıza — status CHECK içinde 'rejected' (Yapılamadı / Dikkate alınmadı)
--      Ana betikle birlikte çalıştırın; ayrı dosya: guest-buckets-status-rejected.sql
--      Eski CHECK 'rejected' veya 'done' içermiyorsa admin PATCH başarısız olur.
-- -----------------------------------------------------------------------------
alter table if exists public.guest_requests drop constraint if exists guest_requests_status_check;
alter table if exists public.guest_requests drop constraint if exists guest_requests_status_chk;

alter table if exists public.guest_requests
  add constraint guest_requests_status_check
  check (
    status is null
    or lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

alter table if exists public.guest_complaints drop constraint if exists guest_complaints_status_check;
alter table if exists public.guest_complaints drop constraint if exists guest_complaints_status_chk;

alter table if exists public.guest_complaints
  add constraint guest_complaints_status_check
  check (
    status is null
    or lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

alter table if exists public.guest_faults drop constraint if exists guest_faults_status_check;
alter table if exists public.guest_faults drop constraint if exists guest_faults_status_chk;

alter table if exists public.guest_faults
  add constraint guest_faults_status_check
  check (
    status is null
    or lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

-- OPSİYONEL: 8b "violates check constraint" verirse (istek/şikâyet/arıza) geçersiz status’ları düzeltin:
-- update public.guest_requests set status = 'new' where status is not null and lower(trim((status)::text)) not in ('new','pending','in_progress','done','cancelled','rejected');
-- update public.guest_complaints set status = 'new' where status is not null and lower(trim((status)::text)) not in ('new','pending','in_progress','done','cancelled','rejected');
-- update public.guest_faults set status = 'new' where status is not null and lower(trim((status)::text)) not in ('new','pending','in_progress','done','cancelled','rejected');

-- -----------------------------------------------------------------------------
-- 9) guest_reservations — operasyon kolonları + indeksler + status (rejected)
--     Tablo yoksa ALTER’lar atlanır. Admin API: new, pending, in_progress, done,
--     cancelled, rejected (rejected = “Onaylanmadı”).
-- -----------------------------------------------------------------------------
alter table if exists public.guest_reservations
  add column if not exists language text;

alter table if exists public.guest_reservations
  add column if not exists service_code text;

alter table if exists public.guest_reservations
  add column if not exists service_label text;

alter table if exists public.guest_reservations
  add column if not exists reservation_date date;

alter table if exists public.guest_reservations
  add column if not exists reservation_time text;

alter table if exists public.guest_reservations
  add column if not exists guest_count integer;

alter table if exists public.guest_reservations
  add column if not exists description text;

alter table if exists public.guest_reservations
  add column if not exists updated_at timestamptz;

do $$
begin
  if to_regclass('public.guest_reservations') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'guest_reservations'
      and c.conname = 'guest_reservations_type_chk'
  ) then
    alter table public.guest_reservations
      add constraint guest_reservations_type_chk
      check (reservation_type in ('reservation_alacarte', 'reservation_spa'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'guest_reservations'
      and c.conname = 'guest_reservations_guest_count_chk'
  ) then
    alter table public.guest_reservations
      add constraint guest_reservations_guest_count_chk
      check (guest_count is null or guest_count >= 1);
  end if;
end $$;

do $$
begin
  if to_regclass('public.guest_reservations') is null then
    return;
  end if;
  execute
    'create index if not exists idx_guest_reservations_type_date_time on public.guest_reservations (reservation_type, reservation_date, reservation_time)';
  execute
    'create index if not exists idx_guest_reservations_status_submitted on public.guest_reservations (status, submitted_at desc)';
  execute
    'create index if not exists idx_guest_reservations_service_code on public.guest_reservations (service_code)';
  execute
    'create index if not exists idx_guest_reservations_room_number on public.guest_reservations (room_number)';
end $$;

do $$
begin
  if to_regclass('public.guest_reservations') is null then
    return;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_reservations'
      and column_name = 'reservation_data'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'guest_reservations'
        and column_name = 'raw_payload'
    ) then
      update public.guest_reservations
      set
        language = coalesce(language, nullif(raw_payload->>'language', '')),
        updated_at = coalesce(updated_at, submitted_at, now())
      where true;
    end if;
    return;
  end if;

  -- note sütunu yoksa (eski şema) açıklama birleştirmesi atlanır
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_reservations'
      and column_name = 'note'
  ) then
    update public.guest_reservations
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
  else
    update public.guest_reservations
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
      updated_at = coalesce(updated_at, submitted_at, now())
    where true;
  end if;
end $$;

-- Status CHECK: kovalar (8b) ile aynı mantık — lower(trim), rejected dahil; tekrar yapıştırınca güncellenir.
alter table if exists public.guest_reservations drop constraint if exists guest_reservations_status_chk;
alter table if exists public.guest_reservations drop constraint if exists guest_reservations_status_check;

alter table if exists public.guest_reservations
  add constraint guest_reservations_status_chk
  check (
    status is null
    or lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

-- OPSİYONEL: "violates check constraint" (guest_reservations.status) — geçersiz değerleri önce düzeltin:
-- update public.guest_reservations set status = 'new'
-- where status is not null
--   and lower(trim((status)::text)) not in (
--     'new','pending','in_progress','done','cancelled','rejected'
--   );

-- -----------------------------------------------------------------------------
-- 10) guest_notifications — misafir bildirimleri (beslenme / sağlık / kutlama)
--     API: guest-requests `type=guest_notification` → bu tabloya insert; admin sekmesi.
--     Ayrı dosya: server/docs/guest-notifications-table.sql (aynı şema; tek betikte burada).
-- -----------------------------------------------------------------------------
create table if not exists public.guest_notifications (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  room_number text not null,
  nationality text not null,
  description text not null default '',
  categories jsonb not null default '[]'::jsonb,
  other_category_note text,
  category text,
  details jsonb not null default '{}'::jsonb,
  source text not null default 'viona_web',
  submitted_at timestamptz not null default now(),
  status text not null default 'new',
  raw_payload jsonb
);

create index if not exists idx_guest_notifications_submitted_at on public.guest_notifications (submitted_at desc);
create index if not exists idx_guest_notifications_status on public.guest_notifications (status);
create index if not exists idx_guest_notifications_category on public.guest_notifications (category);

-- Status CHECK: 8b / guest_reservations ile aynı değerler; tekrar yapıştırınca drop+add ile güncellenir.
alter table if exists public.guest_notifications drop constraint if exists guest_notifications_status_check;
alter table if exists public.guest_notifications drop constraint if exists guest_notifications_status_chk;

alter table if exists public.guest_notifications
  add constraint guest_notifications_status_check
  check (
    lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

-- OPSİYONEL: "violates check constraint" (guest_notifications.status) — geçersiz değerleri önce düzeltin:
-- update public.guest_notifications set status = 'new'
-- where lower(trim((status)::text)) not in (
--   'new','pending','in_progress','done','cancelled','rejected'
-- );

alter table if exists public.guest_notifications enable row level security;

-- -----------------------------------------------------------------------------
-- 11) guest_late_checkouts — geç çıkış (yalnızca web formu; type=late_checkout)
--     WhatsApp: misafir bildirimi şablonu (7 parametre) ile aynı alıcı listesi.
-- -----------------------------------------------------------------------------
create table if not exists public.guest_late_checkouts (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  room_number text not null,
  nationality text not null,
  checkout_date date not null,
  checkout_time text not null,
  description text not null default '',
  details jsonb not null default '{}'::jsonb,
  source text not null default 'viona_web',
  submitted_at timestamptz not null default now(),
  status text not null default 'new',
  raw_payload jsonb
);

create index if not exists idx_guest_late_checkouts_submitted_at on public.guest_late_checkouts (submitted_at desc);
create index if not exists idx_guest_late_checkouts_status on public.guest_late_checkouts (status);
create index if not exists idx_guest_late_checkouts_checkout_date on public.guest_late_checkouts (checkout_date);

alter table if exists public.guest_late_checkouts drop constraint if exists guest_late_checkouts_status_check;
alter table if exists public.guest_late_checkouts drop constraint if exists guest_late_checkouts_status_chk;

alter table if exists public.guest_late_checkouts
  add constraint guest_late_checkouts_status_check
  check (
    lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

-- OPSİYONEL: CHECK hatası — geçersiz status:
-- update public.guest_late_checkouts set status = 'new'
-- where lower(trim((status)::text)) not in ('new','pending','in_progress','done','cancelled','rejected');

alter table if exists public.guest_late_checkouts enable row level security;

-- =============================================================================
-- Bitti. chat_observations, view’lar; istek/şikâyet/arıza kolonları + 8a category + 8b status;
-- guest_reservations; guest_notifications (bölüm 10); guest_late_checkouts (bölüm 11).
--
-- Node API (guest-requests.service.js) kolon eşlemesi — şema sapması insert hatası verir:
--   guest_notifications: guest_name, room_number, nationality, description, categories (jsonb),
--     other_category_note, category, details (jsonb), source, submitted_at, status, raw_payload
--   guest_late_checkouts: guest_name, room_number, nationality, checkout_date (date),
--     checkout_time (text, HH:MM), description, details (jsonb), source, submitted_at, status, raw_payload
-- Admin API listeleri: GET …/admin/requests?type=guest_notification ve ?type=late_checkout (ayrı tablolar; panoda özet birleşik).
-- Service role anahtarı RLS’i baypas eder; yalnızca anon/authenticated ile yazacaksanız POLICY ekleyin.
-- =============================================================================
