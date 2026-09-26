alter table public.bookings add column checkout_session_id text;
create index bookings_checkout_session_id_idx on public.bookings (checkout_session_id);
alter table public.waitlist add column notified_at timestamptz;