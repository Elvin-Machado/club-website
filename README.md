# Nucleus SJEC

A full-stack club website for the Nucleus student innovation community at St. Joseph Engineering College, Mangaluru.

**Frontend:** Next.js 16 (App Router) for the Team constellation, Vite for the legacy pages (Home, Experiences, Projects, Admin).  
**Backend:** Express + SQLite for events, projects, applications, and admin.

## Project structure

```
├── src/
│   ├── app/                        Next.js App Router
│   │   ├── layout.tsx              Root layout
│   │   ├── globals.css             Tailwind + font faces
│   │   ├── team/page.tsx           Team constellation page (R3F starfield)
│   │   ├── showcase/page.tsx       Speaker showcase page
│   │   └── (existing)/             Catch-all that renders the Vite legacy pages
│   ├── vite-pages/                 Legacy Vite pages (routed by react-router inside App)
│   │   ├── EventExplorer.tsx         Experiences — Three.js event coaster ride
│   │   ├── Recruitment.tsx           Join page
│   │   ├── Admin.tsx                 Admin dashboard (lazy-loaded, auth required)
│   │   ├── admin.css                 Admin styles
│   │   └── event-explorer.css        Event explorer styles
│   ├── components/
│   │   ├── home/                   Home page components (from ryan)
│   │   │   ├── LogoLanding.tsx       Three.js particle logo landing
│   │   │   ├── DomainParallax.tsx    Domain cards with 3D tilt
│   │   │   ├── VoicesMarquee.tsx     Scrolling community voices
│   │   │   └── CommunityCTA.tsx      Call-to-action banner
│   │   ├── team/                   Team constellation components (from elvin)
│   │   │   ├── TeamShowcase.tsx      Orchestrates hero → orbit → roster
│   │   │   ├── GalaxyScene.tsx       R3F starfield + film grain
│   │   │   ├── CoreOrbit.tsx         3D orbit ring (12 nodes)
│   │   │   ├── CoreCarousel.tsx      Mobile swipe carousel fallback
│   │   │   ├── MemberProfileOverlay.tsx  Modal dialog for core profiles
│   │   │   ├── RosterSection.tsx     Searchable grouped credits-roll
│   │   │   └── ...                   Photo, types, data, styles
│   │   ├── showcase/               Speaker showcase components
│   │   ├── shared/                 Shared UI (Logo, LogoWorld, Modal)
│   │   ├── ui/                     Reusable widgets (floating-dock, 3D card, reveal)
│   │   ├── ProjectShowcase.tsx     Projects — horizontal deck with detail sheet
│   │   ├── ProjectDetailSheet.tsx  Project detail bottom sheet
│   │   ├── ExistingSite.tsx        Bridges Next.js → react-router for legacy pages
│   │   └── ExistingSiteClient.tsx  Client-only wrapper for ExistingSite
│   ├── lib/                        Shared logic
│   │   ├── event-coaster.ts          Three.js coaster track + motor
│   │   ├── event-world.ts            Walkable Three.js event world
│   │   ├── event-navigation.ts       Station layout and pathfinding
│   │   ├── event-scenery.ts          3D scenery and decorations
│   │   ├── logo-scene.ts             Three.js logo animation
│   │   ├── projects.ts               Project deck data builder
│   │   ├── team.ts                   Team role definitions and helpers
│   │   └── scroll-motion.ts          GSAP scroll utilities
│   ├── assets/                     Static imports (logo PNG)
│   ├── styles.css                  Legacy global styles (Vite app)
│   ├── team.css                    Team Vite page styles
│   ├── App.tsx                     React-router shell (Home, Experiences, Projects, Team)
│   ├── Team.tsx                    Legacy team page (Vite, used by /team route)
│   ├── main.tsx                    Vite client entry
│   ├── entry-server.tsx            Vite SSR entry
│   └── types.ts                    Shared TypeScript types
├── server/
│   ├── app.mjs                    Express app + admin API
│   ├── db.mjs                     SQLite (WAL, auto-seeded)
│   ├── index.mjs                  Node API server entry
│   ├── start.mjs                  Launches both API + Next.js
│   └── create-admin.mjs           CLI admin creation
├── api/index.mjs                  Vercel serverless entry
├── shared/public-data.json        Seed data
├── tests/
│   ├── backend.test.mjs           22 API + auth + SSR integration tests
│   ├── event-coaster.test.mjs     Coaster track + motor unit tests
│   ├── event-navigation.test.mjs  Station layout + pathfinding tests
│   ├── team-showcase.test.mjs     Roster logic unit tests
│   ├── team.test.mjs              Team role mapping tests
│   └── e2e/                       Playwright end-to-end tests
├── public/                         Static assets (fonts, icons, team portraits, project covers)
├── next.config.mjs                 Next.js config (API proxy)
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
- **http://localhost:3000** — Next.js (serves all pages via App Router)
- **http://localhost:5173** — Vite dev server (legacy pages only, optional)

The primary dev experience is Next.js on port 3000. The Vite dev server is available for standalone legacy page development.

Other dev commands:

```sh
npm run dev:web       # Next.js only
npm run dev:api       # Express API only
npm run dev:vite      # Vite dev server only (legacy pages)
```

## Production build

```sh
npm run build         # typecheck + Next.js build + Vite SSR build
npm start             # Express API (port 3001) + Next.js (port 3000)
```

## Pages and features

| Route | Source | Description |
|-------|--------|-------------|
| `/` | ryan (Vite) | Three.js particle logo landing + domain parallax + community CTA + voices marquee |
| `/about` | ryan (Vite) | Domain cards with 3D tilt and detail modals |
| `/events` | ryan (Vite) | Three.js event coaster ride — walk through a neural-network-themed world |
| `/projects` | elvin | Horizontal project deck with detail sheet (framer-motion + GSAP) |
| `/team` | elvin (Next.js) | Cinematic team constellation: R3F starfield, 3D orbit (12 core roles), profile overlays, searchable roster |
| `/recruitment` | ryan (Vite) | Join page |
| `/admin` | elvin (Vite) | Admin dashboard (lazy-loaded, auth required) |
| `/showcase` | elvin (Next.js) | Speaker showcase page |

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
npm test                # 27 integration tests (API, auth, SSR, team, events)
npm run build           # full production build (Next.js + Vite)
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
