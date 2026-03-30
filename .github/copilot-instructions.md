# Copilot Instructions for vehicle-service-record

## Repository Overview

**Duralog** is a full-stack web application to track maintenance and service history for vehicles. Users can manage multiple vehicles and their associated service records (oil changes, brake service, tire rotations, etc.). Data is persisted on the backend and accessible from any device.

## Tech Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Frontend | Remix v2 + React 18 + TypeScript (in `src/ui/`)      |
| Backend  | Node.js + Express 4 + TypeScript (in `src/`)         |
| Database | Prisma ORM + MySQL                                   |
| Styling  | Tailwind CSS v4 + shadcn-style primitives            |
| Build    | Vite 6 (Remix Vite plugin)                           |
| Runtime  | Node.js (ESM throughout, NodeNext module resolution) |

## Project Layout

```
vehicle-service-record/
├── .github/                    # GitHub config and Copilot instructions
├── src/                        # All application source code
│   ├── index.ts                # Express app entry point (port 3001)
│   ├── db.ts                   # Prisma client singleton
│   ├── auth/                   # Auth helpers (cookie, session, password, token)
│   ├── logging/                # Structured JSON logger
│   ├── middleware/             # Express middleware (auth, requestLogging, asyncHandler)
│   ├── openauth/               # OpenAuth integration
│   ├── routes/                 # API route handlers
│   │   ├── auth.ts             # /api/auth/* (login, logout, session)
│   │   ├── vehicles.ts         # /api/vehicles CRUD
│   │   └── records.ts          # /api/vehicles/:id/records CRUD
│   ├── types/                  # Backend TypeScript types
│   └── ui/                     # Remix frontend
│       ├── routes/             # File-based Remix routes
│       ├── components/         # Feature and UI components
│       │   └── ui/             # Shared shadcn-style primitives (Button, Card, Input, etc.)
│       ├── api/                # API client (fetch wrappers)
│       ├── auth/               # Auth context and hooks
│       ├── lib/                # Utility functions (e.g. cn())
│       ├── types/              # Frontend TypeScript types
│       ├── App.tsx             # Main app shell
│       ├── root.tsx            # Remix document shell
│       ├── entry.client.tsx
│       ├── entry.server.tsx
│       └── tsconfig.app.json   # Frontend TS config
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   ├── migrations/             # Prisma migration history
│   └── seed.ts                 # Dev seed script
├── openspec/                   # OpenSpec change management (do not modify manually)
├── package.json                # Root package (type: "module", all scripts here)
├── vite.config.ts              # Remix Vite config (appDirectory: src/ui, buildDirectory: dist/ui)
├── tsconfig.json               # Root TS config (references src/ui and tsconfig.node.json)
├── tsconfig.node.json          # Backend TS config (NodeNext, outDir: dist/)
├── eslint.config.js            # ESLint flat config
├── tailwind.config.ts          # Tailwind config
└── .env.example                # Environment variable template
```

## Bootstrap and Setup

Always run from the repository root. There is a single `npm install` — no separate server install needed.

```bash
# 1. Install all dependencies (covers both frontend and backend)
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and fill in secrets (especially OPENAUTH_SECRET for production)

# 3. Start MySQL and initialize the database
docker compose up -d mysql
npm run db:migrate -- --name init

# 4. Seed development data (creates demo@example.com / change-me123 login)
npm run db:seed
```

## Development

```bash
# Start the server with hot reload (serves both API and Remix UI via Vite middleware)
npm run dev
```

The Express server runs on port 3001. In development, it integrates the Vite dev server as middleware so the Remix frontend is served on the same port — no separate frontend server or proxy is needed.

## Build

```bash
# Build everything (frontend + backend)
npm run build

# Frontend output: dist/ui/  (Remix/Vite build)
# Backend output: dist/      (tsc NodeNext bundle)

# Build frontend only
npm run build:client

# Build backend only
npm run build:server
```

## Run in Production

```bash
# After npm run build:
npm run start
# Runs: node ./dist/index.js
```

## Lint

```bash
npm run lint
# Uses ESLint flat config (eslint.config.js). Fix any lint errors before committing.
```

## Database

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Run pending migrations (dev mode)
npm run db:push       # Push schema to DB without migration history (dev shortcut)
npm run db:seed       # Seed development data
```

After modifying `prisma/schema.prisma`, always run `npm run db:generate` and create a migration in `prisma/migrations`.

## Key Conventions

### UI / Styling

-   Use shadcn-style shared primitives from `src/ui/components/ui` and Tailwind utility classes for all product UI.
-   **Route or feature-specific custom CSS files are disallowed.** Only `src/ui/root.tsx` may import `./index.css?url` and `src/ui/main.tsx` may import `./index.css`.
-   Add new reusable controls to `src/ui/components/ui/` rather than inlining styles.
-   Use the `cn()` utility from `src/ui/lib/utils.ts` for conditional class merging.
-   **Do not write custom styles.** Use shadcn components and their built-in variants directly. Tailwind utility classes that map to CSS variables are allowed (e.g., `text-primary`, `bg-card`), but avoid arbitrary CSS values (e.g., `text-[#abc123]`), inline `style` objects, or any hardcoded design tokens. All UI must be fully themable.

### Navigation

-   **All navigation state must be reflected in the URL.** This includes top-level route changes as well as sub-page navigations such as active tabs, expanded/collapsed sections, and open/closed panels.
-   Use Remix's `useSearchParams` (for query-parameter-driven state) or nested route segments (for path-driven state) to derive UI state from the URL.
-   Never use component-local state (e.g., `useState`) to track **navigation-related** UI state — which tab is active, which item is expanded, or which panel is open. Users must be able to bookmark, share, or reload the page and land in the same UI state. Ephemeral, non-navigable state (e.g., hover, focus, temporary loading indicators) may remain local.

### TypeScript

-   The entire project uses ESM (`"type": "module"` in `package.json`).
-   Backend compiles via `tsconfig.node.json` with `"module": "NodeNext"` to `dist/`.
-   Frontend compiles via `src/ui/tsconfig.app.json`.
-   Strict TypeScript is enabled everywhere. Avoid `any`.

### Auth

-   Session is stored as an `HttpOnly` cookie set by the Express backend.
-   Use `attachAuthUser` middleware for protecting backend routes.
-   The frontend uses Remix loaders/actions to check session state via `/api/auth/session`.

### API

-   All API routes are prefixed with `/api`.
-   Rate limiting is applied globally to `/api` (200 req/min per IP).
-   Vehicle and record routes are scoped to the authenticated user.

### Logging

-   Backend uses structured JSON logging via `src/logging/logger.ts`.
-   Logs are always written to stdout/stderr. Optionally write to a file via `LOG_FILE_PATH`.
-   Each log record includes a `requestId` for correlating frontend and backend events.

## Environment Variables

| Variable                       | Description                                              | Default                                          |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                 | Prisma MySQL connection string                           | `mysql://duralog:duralog@127.0.0.1:3306/duralog` |
| `PORT`                         | Express server port                                      | `3001`                                           |
| `OPENAUTH_SECRET`              | Signing secret for session tokens                        | _(required in production)_                       |
| `OPENAUTH_ISSUER`              | Token issuer                                             | `vehicle-service-record-openauth`                |
| `OPENAUTH_AUDIENCE`            | Token audience                                           | `vehicle-service-record-client`                  |
| `DEV_USER_EMAIL`               | Seeded dev login email                                   | `demo@example.com`                               |
| `DEV_USER_PASSWORD`            | Seeded dev login password                                | `change-me123`                                   |
| `LOG_LEVEL`                    | Backend log threshold (`debug`, `info`, `warn`, `error`) | `debug` in dev, `info` in prod                   |
| `LOG_READ_REQUEST_SAMPLE_RATE` | Sampling rate for read-request logs (0–1)                | `1` in dev, `0.1` in prod                        |
| `LOG_FILE_PATH`                | Optional NDJSON log file path                            | _(disabled)_                                     |

## CI / Validation

There are no automated tests in this repository. Manual verification steps are documented in `README.md`.

Before submitting changes, always:

1. Run `npm run lint` — fix any ESLint errors.
2. Run `npm run build` — ensure the full build succeeds without errors.
3. For UI changes, verify no custom CSS imports were added: `rg -n "\.css(\?url)?['\"]" src/ui`

## Common Pitfalls

-   **Module resolution errors**: The project uses `"type": "module"` with NodeNext resolution. Backend imports must use explicit `.js` extensions (e.g., `import './routes/auth.js'`).
-   **Prisma client not found**: Run `npm install` (triggers `postinstall: prisma generate`) or run `npm run db:generate` manually.
-   **MySQL is required**: Start a MySQL server that matches `DATABASE_URL` before running Prisma commands or starting the app.
-   **Single server in dev**: There is no separate frontend dev server. `npm run dev` starts one Express server on port 3001 that serves both the API and Remix UI.
-   **Missing `.env`**: Copy `.env.example` to `.env` before starting the server.
