# Nucleus SJEC

A complete club website with a skippable logo introduction, three technical domains, a Three.js brain-themed event coaster, server-rendered public content, and a persistent local backend.

## Run locally

Requires **Node.js 24+**. SQLite is provided by Node itself; there is no separate database service to install.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Express server at port 3001. Both processes stop together with Ctrl+C.

For the production build and server-rendered preview:

```sh
npm run build
npm start
```

Open **http://localhost:3001**. Run only one API server on port 3001 at a time.

## Administrator access

```sh
npm run admin:create
```

The command prompts for an email and a password (12+ characters, hidden while typing), then a confirmation. Open `/admin` to sign in. **There are no default credentials or public account registration.** Create a separate account for each authorized administrator.

The dashboard supports:

- Add, edit, publish/unpublish, and delete events and projects.
- Add, edit, and remove team members.
- Open or close recruitment, set a deadline and intake identifier, and edit contact links.
- Review paginated applications, update their internal status, and delete personal data.

An open intake is required before applications are accepted. A passed deadline closes applications automatically. The same email can apply once per intake. Internal review status changes **do not send email**; contact applicants through the club's normal process. No email provider is configured.

## The event ride

The Three.js renderer is loaded only near the event section. The scene includes folded brain hemispheres, neural connections, supported coaster rails, a carriage, and numbered stations generated from published events.

- Start the ride, pause/resume, choose a station, or reset to orbit view.
- The ride pauses when it reaches a station; continue to travel to the next event.
- Drag the scene in orbit view or use fullscreen. Mouse wheel and mobile vertical scrolling remain available for the page.
- A list view exposes every event independently of the renderer.
- Reduced-motion users start in list view and can opt into static 3D station views.
- A renderer failure or lost graphics context falls back to the event list.

No audio, game telemetry, or external graphics service is required. The scene disposes GPU resources on unmount, caps pixel density, and suspends rendering offscreen or in a hidden browser tab.

## The team page

Open `/team` from **The team** in the navigation or from the homepage team preview. The page preserves the site's React / TypeScript stack and navy, mint, and serif styling. GSAP ScrollTrigger moves through the 12 core roles in order; a deferred Three.js orbit illustrates the team introduction. Role shortcuts and previous/next controls provide direct navigation. Members appear afterwards in a normal card grid with introductions in accessible dialogs.

Use **Read as a list** for a standard layout. Reduced-motion preferences and short viewports automatically use the list. Without JavaScript, the production server renders every core role and member card. WebGL failure leaves the static orbit illustration in place.

The roster still comes from `/api/site`. In the admin dashboard, **Team → Edit → Introduction** saves an optional biography for either a lead or a member. Existing records need no migration: missing biographies use role or community introductions, and initials stand in for portraits. Add a person with the role **System Design Lead** to fill that currently unassigned card. The existing Event Lead is preserved in the members grid. No names or personal achievements have been invented.

## Backend and data

The default database is `data/nucleus.sqlite`, with SQLite WAL enabled. It is seeded once from `shared/public-data.json`; restarting the server preserves edits. The seed uses the existing club's public events, leadership, project, and closed recruitment status. Review dates and copy in the dashboard before launch.

Only these domains are accepted in recruitment: `aiml`, `web`, and `dsa`.

Public routes:

- `GET /api/health` — server/database readiness
- `GET /api/site` — published events, projects, team, and current settings
- `POST /api/applications` — validated application submission

Admin routes under `/api/admin` require an authenticated session. Mutations require the session CSRF token. Passwords are salted with scrypt; only hashed session tokens are persisted. Cookies are HttpOnly and SameSite=Strict, and are Secure with a `__Host-` prefix in production. Origin checks, request size limits, rate limits, prepared database statements, and a production CSP are configured.

Rate limits use process memory, appropriate for this single-instance server. A multi-instance deployment needs a shared limiter and database architecture. A production CAPTCHA can be added if the existing honeypot and rate limits prove insufficient.

## Deployment

Copy `.env.example` to `.env` for local configuration. Production requires:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
APP_ORIGIN=https://nucleussjec.in
DATABASE_PATH=/app/data/nucleus.sqlite
TRUST_PROXY=1
```

Use `TRUST_PROXY=1` only behind one trusted reverse proxy. Serve HTTPS at that proxy and forward to this server. The public origin must match `APP_ORIGIN` exactly. The canonical, sitemap, and social URLs currently target `nucleussjec.in`; update them if deploying to another domain.

This backend requires **a persistent Node host and a persistent disk**. Deploy to a VPS or a container platform with a volume. Do not deploy SQLite to an ephemeral serverless filesystem. A frontend-only Vercel upload will not run this backend.

Example Docker commands, with HTTPS supplied by your hosting proxy:

```sh
docker build -t nucleus .
docker run -d --name nucleus -p 3001:3001 -v nucleus-data:/app/data -e APP_ORIGIN=https://nucleussjec.in -e TRUST_PROXY=1 nucleus
docker exec -it nucleus npm run admin:create
```

Back up the database regularly using SQLite's online backup API or after a clean server shutdown. Do not copy only the main `.sqlite` file while the application is writing; committed changes may be in the WAL. Keep backups private. Establish an application retention policy and use the dashboard's deletion action for removal requests.

The server renders fresh database content into the initial HTML and compresses HTTP responses. Static fingerprinted assets use immutable caching; Three.js and the admin interface are separate deferred bundles. Inter is self-hosted with `font-display: swap`. The original public Nucleus logo is preserved.

## Verification

```sh
npm run check
```

This type-checks and builds both browser and server bundles, then runs integration tests against temporary databases and local HTTP servers. Coverage includes authorization, CSRF, origin checks, intake closure, validation, duplicates, the application lifecycle, content CRUD, database persistence, and server-rendered production routes.

Visual browser QA still needs a WebGL-enabled browser. Check a narrow mobile viewport, keyboard navigation, reduced motion, pause/resume, all event stops, fullscreen, and list fallback. There are no measured Lighthouse or Core Web Vitals scores in this repository.
