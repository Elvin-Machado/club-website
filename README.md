# Nucleus SJEC

A full-stack club website for the Nucleus student innovation community at St. Joseph Engineering College, Mangaluru.

**Frontend:** Next.js 16 (App Router) for the Team showcase, Vite (SSR) for the legacy pages.  
**Backend:** Express + SQLite for events, projects, applications, and admin.

## Project structure

```
├── src/
│   ├── app/                        Next.js App Router
│   │   ├── layout.tsx                Root layout
│   │   ├── globals.css               Tailwind + font faces
│   │   ├── team/page.tsx             Team constellation page
│   │   └── (existing)/               Catch-all for legacy Vite pages
│   ├── components/
│   │   ├── team/                     Team constellation components
│   │   │   ├── GalaxyHero.tsx          R3F starfield + letterbox + film grain
│   │   │   ├── CoreOrbit.tsx           Desktop 3D orbit ring (12 nodes)
│   │   │   ├── CoreCarousel.tsx        Mobile swipe carousel fallback
│   │   │   ├── MemberProfileOverlay.tsx Modal dialog for core profiles
│   │   │   ├── RosterSection.tsx       Searchable grouped credits-roll
│   │   │   ├── TeamShowcase.tsx        Orchestrates hero → orbit → roster
│   │   │   ├── MemberPhoto.tsx         next/image wrapper
│   │   │   ├── SceneBoundary.tsx       WebGL error boundary
│   │   │   ├── useSceneCapabilities.ts Detects WebGL, mobile, reduced-motion
│   │   │   ├── team-data.ts            Example core + roster data
│   │   │   ├── team-showcase.css       Scoped styles
│   │   │   ├── roster.ts              Filter + group helpers
│   │   │   └── types.ts               CoreMember, ClubMember, TeamShowcaseProps
│   │   ├── ExistingSite.tsx           Vite legacy site renderer
│   │   ├── EventExplorer.tsx          Three.js event coaster
│   │   ├── Logo.tsx                   SVG logo
│   │   ├── Modal.tsx                  Shared modal
│   │   └── ...
│   ├── lib/                        Shared logic (team roles, event navigation)
│   ├── assets/                     Static imports (logo)
│   ├── styles.css                  Legacy global styles
│   ├── App.tsx                     Legacy router (Vite entry)
│   ├── main.tsx                    Legacy client entry
│   └── entry-server.tsx            Legacy SSR entry
├── server/
│   ├── app.mjs                      Express app + admin API
│   ├── db.mjs                       SQLite (WAL, auto-seeded)
│   ├── index.mjs                    Node server entry
│   ├── start.mjs                    Launches both API + Next.js
│   └── create-admin.mjs             CLI admin creation
├── api/index.mjs                   Vercel serverless entry
├── shared/public-data.json         Seed data
├── tests/
│   ├── *.test.mjs                  22 integration tests (API, auth, data)
│   ├── team-showcase.test.mjs       Roster logic unit tests
│   └── e2e/team.spec.mjs           21 Playwright e2e tests
├── public/                         Static assets (fonts, icons, team portraits)
├── scripts/                        Dev utilities
├── next.config.mjs                 Next.js config (image patterns, API proxy)
├── vite.config.ts                  Vite config (legacy pages)
├── playwright.config.mjs           Playwright config
├── tsconfig.json                   TypeScript strict config
├── Dockerfile                      Multi-stage Docker build
├── vercel.json                     Vercel deployment config
└── package.json
```

## Run locally

Requires **Node.js 24+**. SQLite is built into Node.

```sh
npm install
npm run dev
```

Opens both:
- **http://localhost:3000** — Next.js (Team page + legacy page proxy)
- **http://localhost:5173** — Vite dev server (legacy pages)

Other dev commands:

```sh
npm run dev:web       # Next.js only
npm run dev:legacy    # Vite + API
npm run dev:api       # Express API only
```

## Production build

```sh
npm run build         # typecheck + Vite build + Next.js build
npm start             # Express API (port 3001) + Next.js (port 3000)
```

## Pages and features

| Route | Framework | Description |
|-------|-----------|-------------|
| `/team` | Next.js | Cinematic team page: R3F starfield, 3D orbit (12 core roles), profile overlays, searchable roster (3 members in 1 team) |
| `/` | Vite | Three.js particle logo landing + domain parallax |
| `/about` | Vite | Domain cards with detail panels |
| `/events` | Vite | Three.js event coaster ride |
| `/projects` | Vite | Project grid with links |
| `/admin` | Vite | Admin dashboard (lazy-loaded, auth required) |

### Team page details

- **Hero:** Full-bleed React Three Fiber starfield with particle drift, parallax on mouse move, letterbox bars for cinematic framing, film-grain overlay, scroll cue
- **Core orbit (desktop):** 8 glowing nodes orbiting a central emblem; drag to rotate, click to dolly-zoom into a profile overlay
- **Carousel (mobile):** Swipeable card carousel replacing the 3D orbit
- **Profile overlay:** Full-bleed dialog with photo, bio, socials, smooth transitions
- **Roster:** Grouped by team (Tech, Design, Events, Outreach, Content, Ops), search by name/team/role, hover-reveal portraits, staggered viewport entrance
- **Accessibility:** Reduced-motion: static starfield, no WebGL canvas, simple fades. Skip link. Search field with label. Profile dialog with focus trap.
- **Performance:** R3F dynamically imported with `ssr: false`. Particle/geometry counts reduced on mobile. WebGL context capped and disposed on unmount.

## Verification

```sh
npm run typecheck       # TypeScript strict check
npm test                # 22 integration tests
npx playwright test     # 21 e2e tests (hero, roster, carousel, profile, a11y)
npm run build           # full production build
```

## Administrator access

```sh
npm run admin:create
```

Prompts for email + password (12+ chars). Open `/admin` to sign in.

## Backend

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server readiness |
| `/api/site` | GET | Published events, projects, team, settings |
| `/api/applications` | POST | Application submission |

Admin routes under `/api/admin/*` require authenticated session + CSRF. Passwords use scrypt + random salts.

## Deployment

```sh
# Docker
docker build -t nucleus .
docker run -d -p 3001:3001 -v nucleus-data:/app/data -e APP_ORIGIN=https://nucleussjec.in nucleus
docker exec -it nucleus npm run admin:create
```

The backend requires a persistent host and disk for SQLite. The Next.js frontend can deploy to Vercel or any Node host.

## License

Internal club project.
