# Nucleus SJEC

A complete club website with a skippable logo introduction, three technical domains, a Three.js brain-themed event coaster, server-rendered public content, and a persistent local backend.

## Run locally

Requires **Node.js 24+**. SQLite is provided by Node itself; there is no separate database service to install.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Vite proxies `/api` to the Express server at port 3001. Both processes stop together with Ctrl+C.

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

The Experiences page (`/events`) loads a Three.js coaster around the upright Nucleus sculpture. Three default stations are always present; missing published content gets explicitly labelled preview stations.

- Hold W/D or the arrow keys to accelerate; S/A brakes and reverses. Drag to look, use Map to orbit, and Restart to return to the beginning. Phones and tablets with a coarse touch pointer also get a joystick; mouse devices do not.
- The ride automatically brakes at stations. Continue resumes travel. Opening a dialog freezes the ride.
- Open **Add Event**, sign in with an existing administrator account, paste event details, and select a photo folder or individual photos. Publishing stores the event, its collision-checked station position, and gallery photos in SQLite for every visitor.
- Albums accept up to 20 JPG, PNG, WebP or AVIF inputs (12 MB each, 80 MB total). The client processes images one at a time at up to 1280 pixels; uploads are limited to 500 KB per image and 6 MB per album. Galleries load photos only when opened.
- The station planner checks platform footprints against the logo, buildings, other platforms and other track sections. If the finite track is full, publishing returns an explicit error. Existing overflow events remain accessible from **Events**.
- Reduced motion disables banking, automatic orbit, and animated map transitions. A renderer failure or lost graphics context falls back to the event list; event publishing and galleries remain available.

The scene uses spatially grouped instancing, distant rail/window detail levels, and a single opaque logo surface. Adaptive quality adjusts pixel ratio and decorative detail using sustained frame times, with a pixel budget for large screens and slower recovery to prevent oscillation. The motor and camera timing do not depend on the quality level. Rendering stops offscreen, in hidden tabs, and behind dialogs; GPU resources are disposed on unmount.

## Backend and data

The default database is `data/nucleus.sqlite`, with SQLite WAL enabled. It is seeded once from `shared/public-data.json`; restarting the server preserves edits. The seed uses the existing club's public events, leadership, project, and closed recruitment status. Review dates and copy in the dashboard before launch.

Only these domains are accepted in recruitment: `aiml`, `web`, and `dsa`.

Public routes:

- `GET /api/health` — server/database readiness
- `GET /api/site` — published events, projects, team, and current settings
- `POST /api/applications` — validated application submission

Admin routes under `/api/admin` require an authenticated session. Mutations require the session CSRF token. Passwords are salted with scrypt; only hashed session tokens are persisted. Cookies are HttpOnly and SameSite=Strict, and are Secure with a `__Host-` prefix in production. Origin checks, request size limits, rate limits, prepared database statements, and a production CSP are configured.

`PUT /api/admin/experience-events/:uuid` atomically publishes an event, reserves a station and saves its photo album. Request retries reuse the UUID. `GET /api/event-photos/:id` serves only photos belonging to published events. Existing admin edits preserve station positions and albums; deleting an event cascades to its photos. The `event_photos` table is created automatically on startup and is included in the SQLite backup.

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

Run `npm run test:browser` for desktop, phone, tablet, photo-folder publishing, independent visitor access, keyboard movement, reduced motion and WebGL fallback checks. It starts Vite on port 3010 and uses an isolated test database; it does not publish to the real club database. Install the test browser first with `npx playwright install chromium` if needed.

Performance measurements depend on the browser and GPU. The browser suite logs frame intervals and render counts; a 60 FPS result on one machine is not a guarantee for all devices. Validate on representative physical phones and tablets before release. There are no measured Lighthouse or Core Web Vitals scores in this repository.
