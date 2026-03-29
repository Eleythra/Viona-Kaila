-- =============================================================================
-- VIONA / KAILA — Supabase SQL Editor’a TEK SEFERDE yapıştırın
-- Sıra: uzantı → tablo → eksik kolonlar (eski kurulumlar) → CHECK’ler → indeksler
--       → isteğe bağlı chat_logs backfill → özet view’lar → şikâyet/arıza kolonları
--
-- NOT: CHECK eklenirken "violates check constraint" alırsanız, aşağıdaki
--      "OPSİYONEL: CHECK öncesi veri temizliği" bölümünü sırayla çalıştırın.
-- Node (service_role) RLS’i baypas eder; yalnızca anon key ile doğrudan yazım
-- yapacaksanız RLS politikalarını ayrıca tanımlamanız gerekir.
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
-- 4) CHECK kısıtları (yoksa ekler)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chat_obs_response_type_chk') then
    alter table public.chat_observations
      add constraint chat_obs_response_type_chk
      check (response_type in ('answer','redirect','inform','fallback') or response_type is null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_obs_layer_used_chk') then
    alter table public.chat_observations
      add constraint chat_obs_layer_used_chk
      check (layer_used in ('rule','rag','llm','fallback') or layer_used is null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_obs_message_not_empty_chk') then
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
-- 8) Şikâyet / arıza tabloları — category + details (misafir formları + admin)
--     Tablo yoksa PostgreSQL "skipping" NOTICE verir, hata vermez (IF EXISTS).
-- -----------------------------------------------------------------------------
alter table if exists public.guest_complaints
  add column if not exists category text;

alter table if exists public.guest_complaints
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table if exists public.guest_faults
  add column if not exists category text;

alter table if exists public.guest_faults
  add column if not exists details jsonb not null default '{}'::jsonb;

-- =============================================================================
-- Bitti. Hata yoksa: Table Editor’da chat_observations satırı ve view’ları görmelisiniz.
-- =============================================================================
