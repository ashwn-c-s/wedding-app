# Ashwin & Amritha wedding app

Angular 21 invitation frontend, Express 5 API, and the existing Supabase database/Auth project. Frontend and API use separate existing Vercel projects connected to `main`.

## Local development

Use Node.js 22 or newer. Install each workspace using its committed lockfile:

```sh
cd backend
npm ci
npm run dev
```

Create `backend/.env` locally with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep it out of Git. `PORT` defaults to 3000. Optional `FRONTEND_URL` is a comma-separated CORS allowlist; its default includes `http://localhost:4200` and the existing production frontend.

In a second terminal:

```sh
cd frontend/wedding-frontend
npm ci
npm start
```

Open `http://localhost:4200`. The frontend environment files contain only the Supabase publishable key; the service-role key must remain server-side. Development reads the configured Supabase project: do not submit/import/edit production data as test fixtures.

## Features

- Public invitation at `/` and generic fallback for invalid invitation links.
- Personalized `/invite/:token`, event-scoped RSVP review/confirmation, and venue details.
- Supabase email/password admin login at `/admin/login`.
- Full administrators manage guests, import CSV, share invitation links, and edit existing events.
- Full and restricted administrators view filtered RSVP counts and export safe CSV.
- Gallery is intentionally excluded; old gallery links return to the invitation.

CSV header: `name,phone,party_size,events`; event slugs are separated with `+`. Import reports each row independently. Re-importing preserves tokens and requires existing event assignments to match; confirmed guest details stay locked. A new guest may need owner reconciliation if its event assignment fails. This limitation avoids deleting data or adding unapproved transaction functions.

## Validation

```sh
# From backend/
npm test
npm audit

# From frontend/wedding-frontend/
npm test -- --watch=false
npm run build
npm audit
```

Backend tests mock Supabase and exercise local HTTP routes. Frontend uses Angular TestBed/Vitest. Tests never write production data. There is no configured lint command.

## Admin setup and release checks

A valid Supabase Auth login alone does not grant admin access. The owner must enroll an existing confirmed account in `admin_users` with `full` or `restricted`; the API verifies JWTs and the role on each operation. The owner-operated `backend/scripts/enroll-admin.cjs` requires explicit approval of its target identity and role before running. It does not create Auth accounts.

See [backend security evidence](backend/SECURITY_AND_RELEASE.md) and [release report](RELEASE_REPORT.md) for verification, policy checks and limitations. `docs/policy-review.sql` is read-only SQL for owner inspection, not a migration. No database schema or RLS changes accompany this implementation.

Vercel frontend root: `frontend/wedding-frontend`; backend root: `backend`. The API exports its Express app for Vercel detection. Frontend routing rewrites preserve deep links. Verify both deployments after pushing and check the production CORS allowlist before changing any environment settings.
