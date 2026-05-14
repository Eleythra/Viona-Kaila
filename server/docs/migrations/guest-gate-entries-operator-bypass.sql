-- Operatör kapı bypass — `verification_method` CHECK genişletmesi (Supabase SQL Editor, bir kez).

alter table public.guest_gate_entries drop constraint if exists guest_gate_entries_verification_method_check;

alter table public.guest_gate_entries
  add constraint guest_gate_entries_verification_method_check check (
    verification_method in (
      'deploy_bypass',
      'elektra',
      'password_dual',
      'hotel_advisor',
      'operator_bypass'
    )
  );

comment on column public.guest_gate_entries.verification_method is
  'hotel_advisor: PMS; operator_bypass: env oda+doğum (test); password_dual / deploy_bypass / elektra: eski';
