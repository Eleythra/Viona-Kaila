-- Platform bağımsız harici yorumlar (Google, ileride Tripadvisor / Booking vb.)
-- Supabase SQL Editor veya migration ile uygulayın. Servis rolü ile yazılır.

create table if not exists public.platform_reviews (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = any (array['google'::text, 'tripadvisor'::text, 'booking'::text])),
  external_review_id text not null,
  external_location_id text,
  location_name text,
  hotel_name text not null default 'Kaila Beach',
  reviewer_name text,
  reviewer_photo_url text,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  comment text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  reply_comment text,
  reply_updated_at timestamptz,
  is_replied boolean not null default false,
  raw_payload_json jsonb,
  synced_at timestamptz not null default now(),
  first_ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_reviews_source_external_unique unique (source, external_review_id)
);

create index if not exists platform_reviews_source_review_created_idx
  on public.platform_reviews (source, review_created_at desc nulls last);

create index if not exists platform_reviews_source_synced_idx
  on public.platform_reviews (source, synced_at desc nulls last);

create index if not exists platform_reviews_rating_idx
  on public.platform_reviews (source, rating);

comment on table public.platform_reviews is 'Harici platform yorumları; upsert anahtarı (source, external_review_id).';
