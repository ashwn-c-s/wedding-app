# Wedding web app — requirements & blueprint

## Project overview

A personalised wedding web application for Ashwin's wedding. Guests receive a unique WhatsApp link that takes them to a private, personalised invite page — no login required. The app handles event info, personalised RSVPs, venue directions, and a shared photo gallery. An admin panel lets you, your partner, and a family member manage guests, view RSVPs, and control content.

---

## Wedding events

| Event | Date | Time | Status |
|---|---|---|---|
| Mehndi | Nov 13, 2026 | TBD | Hidden (confirm later) |
| Wedding ceremony | Nov 15, 2026 | Morning | Active |
| Reception | Nov 15, 2026 | Evening | Active |

- Wedding ceremony and reception are at **different venues**
- Mehndi is not yet confirmed — it exists in the database as `is_visible = false` and is activated with a single admin toggle (no code change required)

---

## Users & roles

### Guest (unauthenticated)
- Identified solely by a UUID token in the URL (`/invite/:token`)
- No login, no session, no account
- Sees only the events they are personally assigned to
- Can view general event overview (all visible events listed)
- Can RSVP once — locked after submission, no edits
- Can view venue info for their events only
- Can view and upload photos to the gallery

### Admin — full access (you + partner)
- Authenticated via Supabase Auth (email login)
- Can import guest list via CSV
- Can assign guests to events
- Can generate and copy unique invite links (WhatsApp format)
- Can manage events (edit venue info, toggle mehndi visibility)
- Can upload pre-wedding photos
- Can view and delete guest photo uploads
- Can view full RSVP dashboard

### Admin — restricted (family member)
- Authenticated via Supabase Auth (email login)
- Can view RSVP dashboard only
- Cannot add/edit/delete guests
- Cannot manage events or gallery
- Enforced at the database level via RLS — not just hidden in the UI

---

## Guest access & invite flow

1. You import a CSV → guests are created in the database
2. Each guest gets a unique UUID token auto-generated on import
3. Admin panel shows a per-guest WhatsApp share button with pre-filled message + unique URL
4. Guest clicks link → lands on `/invite/:token` → sees their personalised invite
5. Guest sees their assigned events and can navigate to RSVP, venues, gallery

**WhatsApp link format:**
```
https://wa.me/?text=You're+invited+to+Ashwin+%26+[Partner]'s+wedding!%0A%0AYour+personal+invite%3A+https%3A%2F%2Fyourweddingdomain.com%2Finvite%2F{token}
```

---

## CSV import format

```
name, phone, party_size, events
Ramesh Kumar, 9876543210, 3, wedding+reception
Priya Nair, 9123456789, 1, wedding
Sunita Sharma, 9000001111, 2, reception
```

- `party_size` = total number of people including the guest (e.g. 3 = guest + 2 family)
- `events` = `+`-separated list of event slugs (`wedding`, `reception`, `mehndi`)
- Phone numbers stored as strings (no formatting assumed)
- Import is idempotent on phone number — re-importing the same number updates rather than duplicates

---

## RSVP rules

- One RSVP form per guest, scoped to their assigned events only
- Guest sees a yes/no toggle per assigned event
- On submission: rows inserted into `rsvps` table, one per event
- After submission: token URL redirects to a confirmation/thank-you screen
- No edit path — enforced by RLS (no UPDATE on `rsvps` for guest role)
- If guest clicks link again after RSVP: show "You've already responded" screen with their answers

---

## Venues

- Each event has its own venue
- Venue page shows: venue name, written address, custom directions/landmark notes, Google Maps embed
- Guest only sees venues for their assigned events
- Venue info is editable by full admins from the admin panel

---

## Photo gallery

| Album | Who uploads | When |
|---|---|---|
| Pre-wedding | Full admins only | Before Nov 15 |
| Post-wedding | Guests (open upload) | After the event |

- Stored in Supabase Storage
- No moderation queue — guests upload freely to post-wedding album
- Full admins can delete any photo from admin panel
- Gallery visible to all valid token holders

---

## Design & UX

- **Visual style:** Modern and minimal — clean, elegant, muted tones
- **Language:** English only
- **Responsive:** Mobile-first (most guests open on phone via WhatsApp)
- **Countdown timer:** Live countdown to Nov 15, 2026 on guest landing page
- **Error states:**
  - Invalid/unknown token → "This invite link is not valid" page
  - Already RSVP'd → "You've already responded" screen with their answers
  - Event not visible (mehndi hidden) → silently excluded, no error shown

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20, TypeScript, Angular CLI (esbuild) |
| Styling | Tailwind CSS v4 |
| UI Components | Angular Material v3 |
| Routing | Angular Router (standalone) |
| State | Angular Signals (no NgRx needed) |
| HTTP | Angular HttpClient |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email, admin only) |
| File storage | Supabase Storage |
| Deployment | Vercel (frontend) + Railway or Render (backend) |

---

## Angular 20 — key concepts vs Angular 15

This project is built with modern Angular patterns. Key differences from Angular 15:

| Angular 15 (what you know) | Angular 20 (what you'll use) |
|---|---|
| `NgModule` required | Standalone components — no NgModule |
| `*ngIf`, `*ngFor` directives | `@if`, `@for` built-in control flow |
| Constructor-based DI | `inject()` function |
| RxJS for state (BehaviorSubject etc.) | Signals — `signal()`, `computed()`, `effect()` |
| `async` pipe for streams | `toSignal()` or signal-based HTTP |
| `ngOnInit` for lifecycle | `ngOnInit` still works; signals reduce need for it |
| `Component({ ... })` + NgModule | `Component({ standalone: true, imports: [...] })` |
| zone.js required | Zoneless option available (we use zone.js for simplicity) |

You will write every component as standalone. You will use Signals for local state and `@if`/`@for` for templates. No NgModules anywhere.

---

## Database schema

### `events`
```sql
id              uuid primary key default gen_random_uuid()
slug            text unique not null          -- 'wedding' | 'reception' | 'mehndi'
name            text not null
date            date not null
time_label      text                          -- e.g. '10:00 AM onwards'
venue_name      text
venue_address   text
maps_url        text
directions_text text
is_visible      boolean not null default true -- false for mehndi until confirmed
created_at      timestamptz default now()
```

### `guests`
```sql
id            uuid primary key default gen_random_uuid()
name          text not null
phone         text unique not null
party_size    integer not null default 1
invite_token  uuid unique not null default gen_random_uuid()
token_used_at timestamptz
created_at    timestamptz default now()
```

### `guest_events`  ← core access control table
```sql
id        uuid primary key default gen_random_uuid()
guest_id  uuid not null references guests(id) on delete cascade
event_id  uuid not null references events(id) on delete cascade
unique(guest_id, event_id)
```

### `rsvps`
```sql
id           uuid primary key default gen_random_uuid()
guest_id     uuid not null references guests(id)
event_id     uuid not null references events(id)
attending    boolean not null
submitted_at timestamptz default now()
unique(guest_id, event_id)
```

### `photos`
```sql
id           uuid primary key default gen_random_uuid()
storage_path text not null
caption      text
album_type   text not null              -- 'pre' | 'post'
guest_id     uuid references guests(id) -- null if admin upload
created_at   timestamptz default now()
```

### `admin_users`
```sql
user_id  uuid primary key references auth.users(id)
role     text not null                  -- 'full' | 'restricted'
```

---

## Row Level Security (RLS)

### Guest access pattern
Guests have no Auth session. All guest requests go through the Express API using the **service role key** server-side. The API resolves the token, validates access, and returns only permitted data. The service role key is never sent to the browser.

### Admin RLS (Supabase Auth session)
Admins use Supabase Auth JWT. RLS policies enforce role restrictions at the DB level:

```sql
-- Only full admins can insert guests
create policy "full admins only insert guests"
on guests for insert
using (
  exists (
    select 1 from admin_users
    where user_id = auth.uid() and role = 'full'
  )
);
```

---

## API routes (Express)

### Guest routes (token validated, no auth session)

| Method | Route | Description |
|---|---|---|
| GET | `/api/invite/:token` | Resolve token → guest name + assigned visible events |
| GET | `/api/invite/:token/rsvp-status` | Check if RSVP already submitted |
| POST | `/api/invite/:token/rsvp` | Submit RSVP (409 if already submitted) |
| GET | `/api/invite/:token/venues` | Venue info for guest's events only |
| GET | `/api/gallery` | All photos (public) |
| POST | `/api/gallery/upload` | Guest photo upload (token required) |

### Admin routes (Supabase JWT required)

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/guests` | All guests with RSVP status |
| POST | `/api/admin/guests/import` | Import from CSV |
| DELETE | `/api/admin/guests/:id` | Delete guest |
| GET | `/api/admin/rsvps` | Dashboard counts per event |
| GET | `/api/admin/events` | All events |
| PATCH | `/api/admin/events/:id` | Edit event or toggle visibility |
| POST | `/api/admin/gallery` | Admin photo upload |
| DELETE | `/api/admin/gallery/:id` | Delete photo |

---

## Pages & routes (Angular Router — standalone)

### Guest-facing
```
/invite/:token                  → GuestLandingComponent
/invite/:token/rsvp             → RsvpFormComponent
/invite/:token/rsvp/confirmed   → RsvpConfirmedComponent
/invite/:token/venues           → VenueComponent
/invite/:token/gallery          → GalleryComponent
/invalid-invite                 → InvalidInviteComponent
```

### Admin panel
```
/admin/login                    → AdminLoginComponent
/admin/guests                   → GuestManagementComponent   (full only)
/admin/rsvps                    → RsvpDashboardComponent     (all admins)
/admin/events                   → EventManagementComponent   (full only)
/admin/gallery                  → GalleryManagementComponent (full only)
```

---

## Monorepo structure

```
wedding-app/
├── frontend/                        # Angular 20 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/        # ApiService, AuthService, GuestService
│   │   │   │   ├── guards/          # authGuard, adminRoleGuard
│   │   │   │   ├── interceptors/    # authInterceptor (adds JWT header)
│   │   │   │   └── models/          # TypeScript interfaces (Guest, Event, Rsvp...)
│   │   │   ├── features/
│   │   │   │   ├── guest/           # landing, rsvp, venues, gallery components
│   │   │   │   └── admin/           # login, guests, rsvps, events, gallery components
│   │   │   ├── shared/              # reusable UI components (countdown, photo-grid...)
│   │   │   └── app.routes.ts        # root route config (no AppModule)
│   │   └── environments/
│   ├── angular.json
│   └── tailwind.config.js
│
├── backend/                         # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   │   ├── invite.ts
│   │   │   ├── gallery.ts
│   │   │   └── admin/
│   │   ├── middleware/
│   │   │   ├── validateToken.ts
│   │   │   └── requireAdmin.ts
│   │   └── lib/
│   │       └── supabase.ts          # service role client only
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## Environment variables

```env
# frontend/src/environments/environment.ts
apiBaseUrl: 'http://localhost:3000'
supabaseUrl: ''
supabaseAnonKey: ''        # used only for admin Supabase Auth login

# backend/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY= # never sent to browser
PORT=3000
```

---

## Key architectural decisions

| Decision | Choice | Reason |
|---|---|---|
| Guest auth | UUID token in URL | Zero friction — one tap from WhatsApp |
| Token validation | Server-side (Express) | Keeps service key off client, prevents enumeration |
| RSVP mutability | Insert-only, no updates | Simple, safe, DB-enforced |
| Mehndi visibility | `is_visible` DB flag | Admin flips toggle — no deployment needed |
| Admin role enforcement | RLS + API middleware | Blocked at DB level, not just UI |
| Angular state | Signals (not NgRx) | Right-sized for this app; modern Angular pattern |
| No NgModules | Standalone components | Angular 17+ best practice; simpler mental model |
| Photo moderation | None | Trusted guest list |

---

## Open items

- [ ] Mehndi confirmed? → flip `is_visible = true` in Supabase dashboard
- [ ] Partner's name for invite copy and app branding
- [ ] Custom domain
- [ ] Exact venue names and addresses (wedding + reception)
- [ ] Google Maps URLs for both venues
- [ ] Finalise colour palette
