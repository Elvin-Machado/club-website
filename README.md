# Nucleus SJEC

A full-stack club website for the Nucleus student innovation community at St. Joseph Engineering College, Mangaluru. React + Vite (SSR) frontend, Express + SQLite backend.

## Project structure

```
├── api/index.mjs            Vercel serverless entry (wraps server/app.mjs)
├── server/
│   ├── app.mjs              Express app, middleware, public + admin API routes
│   ├── db.mjs               SQLite database (WAL, auto-seeded from shared/ on first run)
│   ├── index.mjs             Node server entry (loads .env, serves SSR + static files)
│   └── create-admin.mjs     CLI to create an admin account
├── shared/public-data.json  Seed data for events, projects, team, and settings
├── src/
│   ├── main.tsx             Client entry (BrowserRouter + lazy Admin)
│   ├── entry-server.tsx     SSR entry (StaticRouter)
│   ├── App.tsx              Route definitions + shared layout
│   ├── Admin.tsx             Admin dashboard (lazy-loaded)
│   ├── Team.tsx              Full team page (GSAP ScrollTrigger + Three.js orbit)
│   ├── api.ts               Typed fetch wrapper for /api/* routes
│   ├── types.ts             Shared TypeScript interfaces
│   ├── styles.css            Global styles + utility classes
│   ├── team.css              Team page styles
│   ├── admin.css             Admin dashboard styles
│   ├── assets/               Static imports (Nucleus logo)
│   ├── components/
│   │   ├── Logo.tsx             SVG logo component
│   │   ├── Modal.tsx            Accessible modal
│   │   ├── LogoLanding.tsx      Three.js particle logo landing (/ route)
│   │   ├── LogoWorld.tsx        3D logo world used by EventExplorer
│   │   ├── DomainParallax.tsx   Domain showcase (parallax scroll, / route)
│   │   ├── EventExplorer.tsx    Three.js event coaster + list (/events)
│   │   ├── TeamOrbit.tsx        Three.js team orbit illustration (/team)
│   │   └── magicui/morphing-text.tsx  Morphing text animation
│   └── lib/
│       ├── event-logo.json    Station geometry data for the event ride
│       ├── event-navigation.ts Graph of walkable event stations
│       ├── event-world.ts     Three.js scene builder for the event ride
│       ├── logo-scene.ts      Three.js scene builder for the logo landing
│       └── team.ts            Team role definitions and roster logic
├── tests/
│   ├── backend.test.mjs       API, auth, CSRF, SSR, and database tests
│   ├── event-navigation.test.mjs  Event graph connectivity and reachability
│   └── team.test.mjs          Team role matching and roster logic
├── public/                 Static assets served at root (fonts, icons, sitemap)
├── scripts/trace-event-logo.py  Dev utility: trace logo paths for station geometry
├── dist/                   Production build output (gitignored)
├── data/nucleus.sqlite     Runtime database (gitignored)
├── index.html              Vite entry HTML
├── vite.config.ts          Vite + React plugin config
├── tsconfig.json           TypeScript strict config (src/ only)
├── package.json            Dependencies, scripts, engine constraint
├── Dockerfile              Multi-stage Docker build (Node 24 Alpine)
└── vercel.json             Vercel build config (serverless backend + static frontend)
```

## Run locally

Requires **Node.js 24+**. SQLite is built into Node — no separate database service needed.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Express server at port 3001. Both processes stop together with Ctrl+C.

Other dev commands:

```sh
npm run dev:web     # Vite dev server only (no backend)
npm run dev:api     # Express server only (no frontend)
```

## Production build

```sh
npm run build       # typecheck + client build + SSR build
npm start           # production server at http://localhost:3001
```

Or run the full verification pipeline:

```sh
npm run check       # build + all integration tests
```

## Verification

```sh
npm run typecheck   # TypeScript strict check
npm test            # 19 integration tests (API, auth, SSR, event graph, team)
npm run check       # build + tests in one command
```

Tests cover: public API, password hashing, rate limiting, CSRF protection, origin checks, intake lifecycle, application validation and dedup, content CRUD, database persistence, server-rendered production routes, event graph connectivity, and team role logic.

## Administrator access

```sh
npm run admin:create
```

Prompts for an email and password (12+ characters). Then open `/admin` in the browser to sign in. There are no default credentials or public registration — create a separate account per administrator.

The dashboard supports:

- Add, edit, publish/unpublish, and delete events and projects
- Add, edit, and remove team members (including introduction/biography)
- Open or close recruitment, set a deadline and intake identifier, and edit contact links
- Review paginated applications and update their internal status

## Pages and features

| Route | Description |
|-------|-------------|
| `/` | Three.js particle logo landing + domain parallax showcase |
| `/about` | Domain cards with detail panels |
| `/events` | Three.js event coaster ride (walkable stations) + list fallback |
| `/projects` | Project grid with links |
| `/team` | Full team page: GSAP ScrollTrigger core team section, member cards with dialog bios, Three.js orbit |
| `/admin` | Admin dashboard (lazy-loaded, requires login) |

**Accessibility**: Reduced-motion preferences automatically use list/static views. Lost WebGL falls back to static markup. The server renders the landing, domains, and all routes without client JavaScript.

## Backend and data

The default database is `data/nucleus.sqlite` with SQLite WAL enabled. It is seeded once from `shared/public-data.json` on first run; restarting preserves edits.

**Public routes:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server and database readiness |
| `/api/site` | GET | Published events, projects, team, and current settings |
| `/api/applications` | POST | Validated application submission |

Admin routes under `/api/admin/*` require an authenticated session with CSRF token. Passwords use scrypt with random salts. Cookies use `HttpOnly`, `SameSite=Strict`, and `__Host-` prefix in production.

Accepted recruitment domains: `aiml`, `web`, `dsa`.

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

This backend requires **a persistent Node host and persistent disk**. Do not deploy SQLite to an ephemeral serverless filesystem. A frontend-only Vercel upload will not run this backend.

**Docker:**

```sh
docker build -t nucleus .
docker run -d --name nucleus -p 3001:3001 -v nucleus-data:/app/data -e APP_ORIGIN=https://nucleussjec.in -e TRUST_PROXY=1 nucleus
docker exec -it nucleus npm run admin:create
```

**Vercel:** `api/index.mjs` serves as a serverless function, but the SQLite database needs a persistent volume. Vercel is suitable for the static frontend; pair it with a separate persistent host for the API.

Back up the database regularly. Do not copy the `.sqlite` file while the server is running — pending writes may be in the WAL file.

## License

Internal club project. Not currently licensed for public use.
