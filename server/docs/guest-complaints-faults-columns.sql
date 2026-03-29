-- Şikâyet / arıza tablolarına guest_requests ile aynı yapıda category + details (isteğe bağlı).
-- Sunucu, kolon yoksa otomatik olarak category/details olmadan insert dener; kolonları ekleyince tam kayıt yazılır.

alter table if exists guest_complaints
  add column if not exists category text;

alter table if exists guest_complaints
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table if exists guest_faults
  add column if not exists category text;

alter table if exists guest_faults
  add column if not exists details jsonb not null default '{}'::jsonb;
