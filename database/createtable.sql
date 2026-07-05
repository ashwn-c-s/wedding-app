create table events (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  date            date not null,
  time_label      text,
  venue_name      text,
  venue_address   text,
  maps_url        text,
  directions_text text,
  is_visible      boolean not null default true,
  created_at      timestamptz default now()
);

create table events (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  date            date not null,
  time_label      text,
  venue_name      text,
  venue_address   text,
  maps_url        text,
  directions_text text,
  is_visible      boolean not null default true,
  created_at      timestamptz default now()
);

create table guest_events (
  id        uuid primary key default gen_random_uuid(),
  guest_id  uuid not null references guests(id) on delete cascade,
  event_id  uuid not null references events(id) on delete cascade,
  unique(guest_id, event_id)
);

create table admin_users (
  user_id  uuid primary key references auth.users(id),
  role     text not null
);


create table photos (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text,
  album_type   text not null,
  guest_id     uuid references guests(id),
  created_at   timestamptz default now()
);



create table rsvps (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references guests(id),
  event_id     uuid not null references events(id),
  attending    boolean not null,
  submitted_at timestamptz default now(),
  unique(guest_id, event_id)
);

alter table events enable row level security;
alter table guests enable row level security;
alter table guest_events enable row level security;
alter table rsvps enable row level security;
alter table photos enable row level security;
alter table admin_users enable row level security;