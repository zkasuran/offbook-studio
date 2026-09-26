
create type public.slot_status as enum ('open','held','booked','done');
create type public.deposit_state as enum ('pending','paid','failed','refunded');
create type public.booking_state as enum ('confirmed','cancelled','completed');
create type public.waitlist_state as enum ('waiting','offered','claimed','expired');
create type public.app_role as enum ('owner');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes int not null,
  price_cents int not null,
  deposit_cents int not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services are public" on public.services for select using (true);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null unique,
  status public.slot_status not null default 'open',
  hold_token uuid,
  hold_expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.slots to anon, authenticated;
grant all on public.slots to service_role;
alter table public.slots enable row level security;
create policy "slots are public" on public.slots for select using (true);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null,
  actor_email text not null,
  service_id uuid not null references public.services(id),
  slot_id uuid not null references public.slots(id),
  deposit_status public.deposit_state not null default 'pending',
  deposit_cents int not null default 0,
  status public.booking_state not null default 'confirmed',
  source text not null default 'web',
  notes text,
  created_at timestamptz not null default now()
);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null,
  actor_email text not null,
  desired_window text not null,
  status public.waitlist_state not null default 'waiting',
  offered_slot_id uuid references public.slots(id),
  claim_token uuid,
  offer_expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
alter table public.waitlist enable row level security;

create table public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  reply text,
  intent text,
  auto_answered boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.inbound_messages to authenticated;
grant all on public.inbound_messages to service_role;
alter table public.inbound_messages enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "owner reads bookings" on public.bookings for select to authenticated using (public.has_role(auth.uid(),'owner'));
create policy "owner reads waitlist" on public.waitlist for select to authenticated using (public.has_role(auth.uid(),'owner'));
create policy "owner reads inbound" on public.inbound_messages for select to authenticated using (public.has_role(auth.uid(),'owner'));
create policy "users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

insert into public.services (name, duration_minutes, price_cents, deposit_cents, description, sort_order) values
  ('Quick Tape', 15, 4500, 2000, 'One scene, clean audio, lit and framed. In and out before your callback list refreshes.', 1),
  ('Standard Tape with Reader', 30, 7500, 2000, 'Two to three scenes with a trained off-camera reader, slate and files sent before you leave.', 2),
  ('Coaching Hour', 60, 12000, 4000, 'A full hour of on-camera coaching and taping. Bring the sides, leave with the take.', 3);

insert into public.slots (starts_at)
select (gs at time zone 'America/Los_Angeles')
from generate_series(
  date_trunc('day', (now() at time zone 'America/Los_Angeles')),
  date_trunc('day', (now() at time zone 'America/Los_Angeles')) + interval '7 days',
  interval '30 minutes'
) gs
where extract(hour from gs) >= 10 and extract(hour from gs) <= 19
  and (gs at time zone 'America/Los_Angeles') > now() + interval '45 minutes';

with picks as (
  select s.id, row_number() over (order by s.starts_at) rn
  from public.slots s
), chosen as (
  select id, rn from picks where rn in (2,5,9,14)
)
update public.slots set status = 'booked' where id in (select id from chosen);

insert into public.bookings (actor_name, actor_email, service_id, slot_id, deposit_status, deposit_cents, source)
select v.name, v.email, sv.id, sl.id, 'paid', sv.deposit_cents, v.source
from (values
  ('Mara Quinn','mara.quinn@example.com','Standard Tape with Reader','web',1),
  ('Dev Okafor','dev.okafor@example.com','Quick Tape','inbound-ai',2),
  ('Lena Ross','lena.ross@example.com','Coaching Hour','waitlist',3),
  ('Theo Marchetti','theo.marchetti@example.com','Quick Tape','web',4)
) as v(name,email,service,source,idx)
join public.services sv on sv.name = v.service
join (
  select id, row_number() over (order by starts_at) rn from public.slots where status = 'booked'
) sl on sl.rn = v.idx;

insert into public.waitlist (actor_name, actor_email, desired_window)
values ('Priya Raghunathan','priya.r@example.com','Tonight after 6pm, or first thing tomorrow');

insert into public.inbound_messages (body, reply, intent, auto_answered)
values (
  'Hey do you have anything tonight? I have an audition due 9am tomorrow.',
  'We can get you taped tonight. Two open slots that beat your 9am deadline are ready to hold with a deposit.',
  'booking_request',
  true
);
