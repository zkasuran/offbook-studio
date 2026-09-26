create table public.outbound_emails (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  kind text not null default 'confirmation',
  delivered boolean not null default false,
  provider_error text,
  booking_id uuid references public.bookings(id),
  created_at timestamptz not null default now()
);
grant select on public.outbound_emails to authenticated;
grant all on public.outbound_emails to service_role;
alter table public.outbound_emails enable row level security;
create policy "owner reads emails" on public.outbound_emails for select to authenticated using (public.has_role(auth.uid(),'owner'));