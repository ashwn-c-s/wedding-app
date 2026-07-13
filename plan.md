# Wedding app — project plan

## About this plan

- **Duration:** 8 weekends (~ 2 months)
- **Commitment:** 4–5 hours per weekend (Sat + Sun)
- **Approach:** Guided learning — concept first, you implement, review after
- **Priority:** Understand every line before moving on
- **Stack:** Angular 20 (your ramp-up vehicle) + Node.js/Express + Supabase
- **Repo:** Monorepo — one repo, `/frontend` (Angular) and `/backend` (Express)
- **Git workflow:** Feature branches + PRs (same as your daily work at GE)
- **Testing:** Dedicated phase after all features are built (Weekend 8)
- **Editor:** VS Code

---

## How to use this plan

Each weekend is a **sprint**. Every sprint has:
- A **concept brief** — what to understand before writing code
- **Tasks** — ordered, checked off as you go
- A **done signal** — how you know the sprint is complete
Work Saturday → Sunday. If a sprint runs over, carry remaining tasks forward before starting new ones. Speed is not the goal — understanding every line is.

When stuck, bring the specific task and your attempt to Claude. Not the whole sprint — the one task.

---

## Angular 15 → 20: your ramp-up cheatsheet

Use this as a quick lookup when something feels unfamiliar. You already know the concept — the syntax has changed.

| Angular 15 (you know this) | Angular 20 (what you'll write) |
|---|---|
| `NgModule` + `declarations` | Standalone components — no NgModule ever |
| `*ngIf="condition"` | `@if (condition) { }` |
| `*ngFor="let x of list"` | `@for (x of list; track x.id) { }` |
| `constructor(private svc: MyService)` | `private svc = inject(MyService)` |
| `BehaviorSubject` / `async` pipe | `signal()`, `computed()`, `toSignal()` |
| `HttpClientModule` in NgModule imports | `provideHttpClient()` in `app.config.ts` |
| `RouterModule.forRoot(routes)` | `provideRouter(routes)` in `app.config.ts` |
| `ActivatedRoute.snapshot.params['id']` | `inject(ActivatedRoute).snapshot.params['id']` |
| `this.router.navigate(['/path'])` | `inject(Router).navigate(['/path'])` |
| `CanActivate` class guard | Functional guard: `export const myGuard = () => ...` |
| `ngOnInit` for init logic | `ngOnInit` still works; use `effect()` for signal reactions |
| `EventEmitter` / `@Output` | Same — or new `output()` function API |
| `@Input() value: string` | Same — or new `input()` signal API |

---

## Git workflow

Every feature follows this flow without exception — this is production practice.

```
main                             → always deployable, branch-protected
  └── feat/supabase-schema
  └── feat/backend-invite-routes
  └── feat/guest-landing-page
  ...
```

**Branch naming:**
```
feat/     new feature
fix/      bug fix
chore/    setup, config, tooling
docs/     markdown, comments only
```

**Conventional commit messages:**
```
feat: add token resolution endpoint
fix: rsvp submits duplicate on double click
chore: configure eslint and prettier
docs: update env variable reference
```

**PR rule:** Even solo — open a PR for every feature branch, review your own diff, then merge. This builds the habit and gives you a clean history to walk through in interviews.

---

## Weekend 1 — Supabase foundations & schema

**What you'll learn:** How Supabase combines Postgres + Auth + Storage in one platform. What Row Level Security is and why it matters (think of it as DB-level `[Authorize]` — similar to what you know from ASP.NET). How to write SQL migrations. Why the service role key must never reach the browser.

**Read before starting:**
- Supabase docs: "Database" overview and "Row Level Security" page (read only, don't follow the tutorial)
- Skim the Supabase Storage docs to understand buckets

### Tasks

- [x] Create GitHub repo `wedding-app`, clone locally, protect `main` branch
- [x] Create `frontend/` and `backend/` folders — repo root stays clean
- [x] Add `.gitignore` at root covering `node_modules`, `.env`, `dist`, `.angular`
- [x] Create a Supabase project at supabase.com (free tier)
- [x] In the Supabase SQL editor, write and run the migration for `events` table (from `requirements.md`)
- [x] Write and run migration for `guests`
- [x] Write and run migration for `guest_events`
- [x] Write and run migration for `rsvps`
- [x] Write and run migration for `photos`
- [x] Write and run migration for `admin_users`
- [x] Run `alter table X enable row level security` for all 6 tables
- [x] Seed 3 rows into `events` — mehndi (`is_visible=false`), wedding, reception
- [x] Manually add 2–3 guest rows and link them via `guest_events` in the Supabase Table Editor
- [x] Create Supabase Storage bucket `wedding-photos` (public read, authenticated write)
- [x] Save `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to a secure local note — never commit

**Done signal:** All 6 tables exist with correct columns and RLS enabled. 3 events seeded. Guest + guest_events rows visible in Table Editor.

**Branch:** `chore/supabase-schema-setup`

---

## Weekend 2 — Backend foundations (Express + token resolution)

**What you'll learn:** Express middleware (your ASP.NET parallel: middleware pipeline + action filters). Why the service role key stays server-side — guests never touch Supabase directly. Token-based identity without sessions.

**ASP.NET parallels:**
- Express route handler ≈ Controller action
- `app.use(middleware)` ≈ `app.UseMiddleware<T>()`
- `req` / `res` ≈ `HttpContext`
- `next()` ≈ calling `await next.Invoke()`

### Tasks

- [x] `cd backend && npm init -y`
- [x] Install dependencies: `express`, `@supabase/supabase-js`, `dotenv`, `cors`, `multer`
- [x] Install dev dependencies: `typescript`, `ts-node`, `nodemon`, `@types/express`, `@types/node`, `@types/cors`, `@types/multer`
- [x] Configure `tsconfig.json` for Node (target: ES2020, module: CommonJS)
- [x] Configure `nodemon.json` to watch `src/**/*.ts`, run via `ts-node`
- [x] Create `src/lib/supabase.ts` — initialise Supabase client with the **service role key** only. Ask yourself: why service role and not anon key here?
- [x] Create `src/index.ts` — Express app with CORS, JSON body parser, health check `GET /api/health → { status: 'ok' }`
- [x] Test health check with VS Code REST Client extension or Postman
- [x] Create `src/middleware/validateToken.ts` — reads `:token` param, queries `guests` by `invite_token`, attaches `guest` to `req`, returns 404 if not found
- [x] Create `src/routes/invite.ts` — mount `validateToken`, implement `GET /api/invite/:token` returning guest name + their visible assigned events (join `guest_events` → `events` where `is_visible = true`)
- [x] Test with a real token from your seeded guest data
- [x] Implement `GET /api/invite/:token/rsvp-status` → `{ submitted: boolean, responses: [] }`
- [x] Implement `POST /api/invite/:token/rsvp` — inserts into `rsvps`, returns 409 if already submitted
- [x] Test: submit RSVP, then submit again — confirm 409 on second attempt
- [x] Implement `GET /api/invite/:token/venues` — return venue fields for guest's events only

**Done signal:** All 4 guest API routes respond correctly. Second RSVP submission returns 409. Unknown token returns 404.

**Branch:** `feat/backend-invite-routes`

---

## Weekend 3 — Angular 20 scaffold & guest landing page

**What you'll learn:** Angular 20 project structure with standalone components. How `app.config.ts` replaces AppModule. Angular Router with functional guards. How `HttpClient` works in a standalone setup. Signals for local component state. The new `@if` / `@for` control flow syntax.

**Your Angular 15 knowledge transfers well here — the concepts are identical, the syntax is what's new.**

### Tasks

- [x] `cd frontend && ng new wedding-frontend --standalone --routing --style=scss --skip-git`
  - Note: `--standalone` is now the default in Angular 20, but be explicit
- [x] Install Tailwind CSS v4 for Angular — follow the official Angular + Tailwind setup guide
- [x] Install Angular Material v3: `ng add @angular/material` — choose a neutral/custom theme
- [x] Install `@supabase/supabase-js` (for admin auth only)
- [x] Review `app.config.ts` — understand `provideRouter`, `provideHttpClient`, `provideAnimations`. This is your new "AppModule"
- [x] Define all routes in `app.routes.ts` — stub all guest and admin pages with placeholder components
- [x] Create `core/models/` — define TypeScript interfaces: `Guest`, `Event`, `RsvpStatus`, `Photo`, `AdminUser`
- [x] Create `core/services/api.service.ts` — inject `HttpClient`, set base URL from `environment.apiBaseUrl`, write typed GET/POST methods
- [x] Create `features/guest/guest-landing/` component (standalone) — inject `ActivatedRoute`, read token from params using `inject()`, call `ApiService` to fetch guest data
- [x] Use `toSignal()` to convert the HTTP Observable to a Signal — understand why: signals give you reactive reads without the `async` pipe
- [x] Build template using `@if` and `@for` — render guest name and list of assigned events
- [x] Create `shared/countdown-timer/` standalone component
  - Use `signal()` for days/hours/minutes/seconds state
  - Use `effect()` or `setInterval` inside `ngOnInit` to tick every second
  - Use `ngOnDestroy` to clear the interval — understand why cleanup matters
  - Target date: November 15, 2026
- [x] Add navigation links to RSVP, Venues, Gallery pages
- [x] Handle loading state (`@if (guest())` vs `@else`) and error state (invalid token → navigate to `/invalid-invite`)
- [x] Create `InvalidInviteComponent` — simple "this link is not valid" page

**Done signal:** `http://localhost:4200/invite/{real-token}` shows guest name, their events, and a live countdown timer. Invalid token navigates to the error page.

**Branch:** `feat/guest-landing-page`

---

## Weekend 4 — RSVP flow & venue page

**What you'll learn:** Angular `HttpClient` for POST mutations. Disabling UI during pending requests with signals. Angular reactive forms vs template-driven forms (you'll use template-driven for simplicity here). `Router.navigate()` for programmatic navigation after form submit.

### Tasks

- [ ] Create `core/services/rsvp.service.ts` — methods: `getRsvpStatus(token)`, `submitRsvp(token, responses)`
- [ ] Create `features/guest/rsvp-form/` component
  - On init: call `getRsvpStatus` — if `submitted === true`, navigate immediately to `/invite/:token/rsvp/confirmed`
  - Render a yes/no toggle (Angular Material `mat-button-toggle`) for each assigned event
  - Use `signal<boolean>(false)` for `isSubmitting` — set true on submit, false on error
  - Disable submit button while `isSubmitting()` is true — prevents double submit
  - On success: navigate to confirmed page
- [ ] Create `features/guest/rsvp-confirmed/` component — display "You've responded" + their answers summary
- [ ] Create `core/services/venue.service.ts` — `getVenues(token)` calling `GET /api/invite/:token/venues`
- [ ] Create `features/guest/venue/` component
  - Use `@for` to render each venue
  - Embed Google Maps via `<iframe [src]="safeUrl">` — you'll need `DomSanitizer` to mark the URL as safe (Angular's XSS protection flags raw iframes — understand why)
  - Show venue name, address, directions text
- [ ] Add a shared `GuestNavComponent` used across all guest pages — links to Home, RSVP, Venues, Gallery

**Done signal:** Full RSVP flow works. Submitting, then clicking the link again, shows the confirmed screen with prior answers. Venue page shows correct venue(s) with working map embed.

**Branch:** `feat/rsvp-and-venues`

---

## Weekend 5 — Photo gallery (view + guest upload)

**What you'll learn:** Supabase Storage — buckets, paths, public URLs. Handling `multipart/form-data` in Express. File upload UX pattern in Angular (progress feedback, preview before upload, error handling).

### Tasks

- [ ] Add `GET /api/gallery` to backend — query `photos` ordered by `created_at desc`, return with public storage URL per photo
- [ ] Add `POST /api/gallery/upload` to backend — accept file via `multer`, upload to Supabase Storage under `post/{timestamp}-{filename}`, insert row into `photos` (`album_type='post'`, `guest_id` from token)
- [ ] Create `core/services/gallery.service.ts` — `getPhotos()` and `uploadPhoto(token, file)` methods
- [ ] Create `features/guest/gallery/` component
  - Two sections: "Pre-wedding" (filtered `album_type='pre'`) and "Post-wedding" (`album_type='post'`)
  - Responsive photo grid with Tailwind (`grid grid-cols-2 md:grid-cols-3`)
- [ ] Create `shared/photo-upload/` standalone component
  - File input (`accept="image/*"`)
  - Preview selected image before upload using `FileReader` API
  - Upload button — use `signal<'idle'|'uploading'|'done'|'error'>` for state machine
  - Button label changes per state: "Upload" / "Uploading…" / "Uploaded!"
  - Client-side file size guard: reject > 10MB before sending
  - On success: re-fetch gallery (call `getPhotos()` again so new photo appears without page refresh)
  - On error: show inline error message, reset to idle

**Done signal:** Guest can view photos in two labelled sections. They can select an image, preview it, upload it, and see it appear in the grid without a page reload.

**Branch:** `feat/gallery`

---

## Weekend 6 — Admin panel (auth + guest management)

**What you'll learn:** Supabase Auth from Angular — sign in, session, JWT. Angular functional route guards (the modern `CanActivate` replacement). Interceptors in standalone Angular (no `HTTP_INTERCEPTORS` token — uses `withInterceptors`). CSV parsing client-side. Role-based routing.

**Angular 15 parallel:** `CanActivate` class guard → functional guard `export const authGuard = () => inject(AuthService).isLoggedIn() || router.navigate(['/admin/login'])`

### Tasks

- [ ] Create `core/services/auth.service.ts`
  - Inject Supabase client (anon key)
  - `signIn(email, password)` → calls `supabase.auth.signInWithPassword()`
  - `signOut()`
  - `session()` — expose as a signal using `toSignal()`
  - `getAccessToken()` — returns JWT string for API calls
- [ ] Create `core/interceptors/auth.interceptor.ts` — functional interceptor that reads the JWT and adds `Authorization: Bearer {token}` header to all `/api/admin/*` requests
- [ ] Register interceptor in `app.config.ts` using `provideHttpClient(withInterceptors([authInterceptor]))`
- [ ] Create `core/guards/auth.guard.ts` — functional guard, redirects to `/admin/login` if no session
- [ ] Create `core/guards/full-admin.guard.ts` — functional guard, checks `admin_users.role === 'full'`, redirects to `/admin/rsvps` if restricted
- [ ] Apply guards to admin routes in `app.routes.ts`
- [ ] Add `requireAdmin` middleware to backend — extract Bearer JWT, verify with Supabase, fetch role from `admin_users`, attach to `req`
- [ ] Add `GET /api/admin/guests` — all guests with event assignments + RSVP status per event
- [ ] Add `POST /api/admin/guests/import` — accept CSV, parse rows, upsert `guests` (on phone conflict: update), insert `guest_events`
- [ ] Build `AdminLoginComponent` — email + password form, call `AuthService.signIn()`, navigate to `/admin/rsvps` on success
- [ ] Build `GuestManagementComponent`
  - Table of all guests: name, phone, party size, assigned events, RSVP status, invite link column
  - CSV import UI: file picker, parse client-side using the browser's `FileReader` + manual CSV split (no library — do it yourself to understand the format), show preview table before posting
  - WhatsApp copy button per guest: builds `wa.me` URL, copies via `navigator.clipboard.writeText()`

**Done signal:** Login works. Importing a CSV creates guests. Guest table shows statuses. WhatsApp link copies to clipboard. Restricted admin is blocked from this page.

**Branch:** `feat/admin-guest-management`

---

## Weekend 7 — Admin dashboard + event management + photo admin

**What you'll learn:** Aggregating data for dashboards. Angular Material data tables. Reactive forms for content editing (edit venue fields). Client-side CSV export without a library. Angular Material snackbar for feedback toasts.

### Tasks

- [ ] Add `GET /api/admin/rsvps` to backend — per-event counts: total invited, responded, attending, declining, pending
- [ ] Build `RsvpDashboardComponent`
  - Stat cards per event (Angular Material `mat-card`) showing counts
  - Full guest table below: name + per-event response (attending / declined / pending)
  - Filter by event using `mat-tab-group`
  - "Export CSV" button — generate CSV string client-side, trigger download via a programmatically clicked `<a download>` element
- [ ] Add `GET /api/admin/events` and `PATCH /api/admin/events/:id` to backend
- [ ] Build `EventManagementComponent`
  - List all 3 events
  - Each event: Angular Reactive Form with fields for venue name, address, maps URL, directions, time label
  - Mehndi row: prominent `mat-slide-toggle` for `is_visible`
  - On save: `PATCH` endpoint, show `MatSnackBar` success toast on response
- [ ] Add `POST /api/admin/gallery` to backend — admin upload to `pre/` prefix, `album_type='pre'`
- [ ] Add `DELETE /api/admin/gallery/:id` — delete from Storage + `photos` table
- [ ] Build `GalleryManagementComponent`
  - Grid of all photos with a delete icon button on each
  - Confirm before delete (Angular Material `MatDialog`)
  - Pre-wedding upload section reusing `PhotoUploadComponent` from Weekend 5

**Done signal:** RSVP dashboard shows correct counts. Mehndi toggle works (flip and verify in Supabase Table Editor). Event venue edit saves correctly. CSV export downloads valid data.

**Branch:** `feat/admin-dashboard-and-events`

---

## Weekend 8 — Testing, polish & deployment

**What you'll learn:** Angular's built-in testing with Jasmine + Karma (or migrate to Vitest). What to unit test vs what to integration test. Vercel deployment with Angular. CORS in production. Environment-specific config.

### Tasks

**Testing**
- [ ] Understand Angular's test setup — `TestBed`, `ComponentFixture`, `spec.ts` files generated by CLI
- [ ] Write test: `CountdownTimerComponent` renders four numeric values (days, hours, minutes, seconds)
- [ ] Write test: `RsvpFormComponent` navigates to confirmed page when `rsvpStatus.submitted === true` on init
- [ ] Write test: `authGuard` redirects to `/admin/login` when no Supabase session
- [ ] Install `supertest` in backend, write test: `GET /api/invite/:token` returns 404 for unknown token
- [ ] Write test: `POST /api/invite/:token/rsvp` returns 409 on second submission
- [ ] Write test: `GET /api/admin/guests` returns 401 without a valid JWT

**Polish**
- [ ] Audit all pages at 375px viewport — fix layout breaks
- [ ] Add loading skeleton using Angular Material `mat-progress-bar` or custom Tailwind skeleton divs
- [ ] Add `<title>` per route using Angular Router's `title` property in route config
- [ ] Handle HTTP error states in all services — catch errors, expose via signal, show retry UI
- [ ] Test the full guest flow on a real mobile device via WhatsApp link
- [ ] Verify RSVP lock: submit, click link again, confirm confirmed screen with prior answers

**Deployment**
- [ ] Create Vercel account, import `wedding-app` repo
- [ ] Set Vercel `Root Directory` to `frontend`, `Framework Preset` to Angular
- [ ] Add all environment variables to Vercel project settings (`apiBaseUrl` pointing to backend)
- [ ] Deploy backend to Railway (preferred) or Render — root directory `backend/`, add all env vars
- [ ] Update CORS `origin` in `backend/src/index.ts` to your Vercel production domain
- [ ] Test full production flow: open real invite link on mobile → RSVP → confirm
- [ ] Set up custom domain in Vercel (when ready)

**Done signal:** App is live. A real WhatsApp invite link works end-to-end on mobile. All written tests pass. RSVP lock works in production.

**Branch:** `feat/testing-and-deployment`

---

## Interview readiness — what this project gives you

By the end of 8 weekends, you can speak to all of these in interviews:

| Topic | What you've done |
|---|---|
| Angular 20 | Standalone components, Signals, new control flow, functional guards, interceptors |
| Component architecture | Shared components, feature-based folder structure, smart vs dumb components |
| HTTP & state | `HttpClient`, converting Observables to Signals with `toSignal()`, error handling |
| Auth | JWT flow, interceptors adding auth headers, route guards |
| Backend | Express REST API, middleware pipeline, token validation, role enforcement |
| Database | Postgres schema design, foreign keys, RLS, junction tables |
| File uploads | Supabase Storage, multipart uploads, client-side preview |
| Testing | Unit tests for components, services, and API routes |
| Deployment | Vercel + Railway, environment config, CORS in production |
| Git | Feature branch workflow, conventional commits, self-reviewed PRs |

---

## Progress tracker

| Weekend | Branch | Status | Notes |
|---|---|---|---|
| 1 — Schema setup | `chore/supabase-schema-setup` | ⬜ Not started | |
| 2 — Express backend | `feat/backend-invite-routes` | ⬜ Not started | |
| 3 — Landing page | `feat/guest-landing-page` | ⬜ Not started | |
| 4 — RSVP + venues | `feat/rsvp-and-venues` | ⬜ Not started | |
| 5 — Gallery | `feat/gallery` | ⬜ Not started | |
| 6 — Admin auth + guests | `feat/admin-guest-management` | ⬜ Not started | |
| 7 — Admin dashboard | `feat/admin-dashboard-and-events` | ⬜ Not started | |
| 8 — Tests + deploy | `feat/testing-and-deployment` | ⬜ Not started | |

Update status to ✅ Done / 🔄 In progress / ⚠️ Blocked as you go.

---

## Open items (from requirements)

- [ ] Confirm mehndi event → flip `is_visible = true` in Supabase dashboard
- [ ] Partner's name for invite copy and app branding
- [ ] Custom domain
- [ ] Exact venue names and addresses (wedding + reception)
- [ ] Google Maps URLs for both venues
- [ ] Finalise colour palette
