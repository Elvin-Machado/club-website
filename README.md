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
│   │   ├── alumni/page.tsx           NUCLEUS Alumni page
│   │   └── (existing)/               Catch-all for legacy Vite pages
│   ├── components/
│   │   ├── team/                     Team constellation components
│   │   │   ├── GalaxyScene.tsx         R3F starfield + film grain
│   │   │   ├── CoreOrbit.tsx           Desktop 3D orbit ring (12 nodes)
│   │   │   ├── CoreCarousel.tsx        Mobile swipe carousel fallback
│   │   │   ├── CommunitySection.tsx    Compact gallery cards for non-core members
│   │   │   ├── AlumniSection.tsx       Alumni cards + empty state
│   │   │   ├── AlumniShowcase.tsx      Alumni page composition
│   │   │   ├── TeamShell.tsx           Shared header/footer for team-family pages
│   │   │   ├── MemberProfileOverlay.tsx Modal dialog for profiles
│   │   │   ├── MemberCard.tsx          Shared small card (members + alumni)
│   │   │   ├── TeamShowcase.tsx        Orchestrates hero → orbit → community
│   │   │   ├── MemberPhoto.tsx         next/image wrapper
│   │   │   ├── SceneBoundary.tsx       WebGL error boundary
│   │   │   ├── useSceneCapabilities.ts Detects WebGL, mobile, reduced-motion
│   │   │   ├── team-data.ts            Current core + community data
│   │   │   ├── alumni-data.ts          Alumni directory (empty by default)
│   │   │   ├── team-showcase.css       Scoped styles
│   │   │   ├── roster.ts              Filter + group helpers
│   │   │   └── types.ts               CoreMember, ClubMember, AlumniMember
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
| `/team` | Next.js + Vite fallback | Complete core constellation followed by Members and Alumni navigation cards |
| `/members` | Next.js + Vite fallback | The existing non-core current members and their profile cards |
| `/alumni` | Next.js + Vite fallback | Verified alumni directory; an empty state until records are supplied |
| `/` | Vite | Three.js particle logo landing + domain parallax |
| `/about` | Vite | Domain cards with detail panels |
| `/events` | Vite | Three.js event coaster ride |
| `/projects` | Vite | Project grid with links |
| `/admin` | Vite | Admin dashboard (lazy-loaded, auth required) |

### Team page details

- **Background:** One existing R3F star field in the shared page shell, with a transparent static fallback over the same charcoal/navy background. It covers the constellation, navigation cards, and both directories.
- **Constellation:** Twelve core portraits around one responsive ellipse. The official logo from `src/assets` stays centred; its transparent padding is cropped only in the display. Desktop members revolve, pause on hover/focus, and support drag, pause and reset controls. Compact screens show every member in a static orbit with room for their full labels.
- **Navigation:** Two equal glass cards enter once on scroll, then briefly scale and fade into `/members` or `/alumni`. Next.js links and the existing React Router preserve browser history and modified clicks. Only The People appears in the top navigation.
- **Profiles:** The existing dialog handles core members, current members and alumni, including photographs, biographies, social links and available alumni career details. Escape closes it and restores focus.
- **Photos and records:** Add an `image` path to a person's record in `src/components/team/team-data.ts`, for example `/team/poorvik.jpg` for a supplied file in `public/team`. Until then, initials provide a consistent neutral placeholder. No stock or generated portraits are used. Add verified former members to `alumni-data.ts`; reusing their current ID removes them from the active directory automatically. Unavailable alumni fields remain unset.
- **Accessibility and performance:** Reduced motion preserves the complete static constellation and disables transition delays. The only WebGL canvas is the shared background; it has fewer particles on phones and pauses when the document is hidden. The DOM orbit works without WebGL. Both destinations provide a visible return link.

## Verification

```sh
npm run typecheck       # TypeScript strict check
npm test                # unit and backend integration tests
npm run test:e2e         # browser checks, including People layout and routing
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
