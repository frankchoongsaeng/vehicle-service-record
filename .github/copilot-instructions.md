# Copilot Instructions for vehicle-service-record

## Repository Overview

**Duralog** is a full-stack web application to track maintenance and service history for vehicles. Users can manage multiple vehicles and their associated service records (oil changes, brake service, tire rotations, etc.). Data is persisted on the backend and accessible from any device.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Remix v2 + React 18 + TypeScript (in `app/` and `src/`) |
| Backend  | Node.js + Express 5 + TypeScript (in `server/`) |
| Database | Prisma ORM + SQLite |
| Styling  | Tailwind CSS v4 + shadcn-style primitives |
| Build    | Vite 6 (Remix Vite plugin) |
| Runtime  | Node.js (ESM at root, CommonJS in `server/`) |

## Project Layout

```
vehicle-service-record/
├── .github/                    # GitHub config and Copilot instructions
├── app/                        # Remix routes and document shell
│   ├── routes/                 # File-based Remix routes
│   ├── entry.client.tsx
│   ├── entry.server.tsx
│   └── root.tsx
├── src/                        # Shared React UI modules
│   ├── api/                    # API client (fetch wrappers)
│   ├── auth/                   # Auth context and helpers
│   ├── components/ui/          # Shared shadcn-style primitives (Button, Card, Input, etc.)
│   ├── lib/                    # Utility functions (e.g. cn())
│   ├── types/                  # Shared TypeScript types
│   └── App.tsx                 # Main app shell
├── server/                     # Express backend
│   ├── src/
│   │   ├── auth/               # Auth helpers
│   │   ├── middleware/         # Express middleware (auth, etc.)
│   │   ├── openauth/           # OpenAuth integration
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts         # /api/auth/* (login, logout, session)
│   │   │   ├── vehicles.ts     # /api/vehicles CRUD
│   │   │   └── records.ts      # /api/vehicles/:id/records CRUD
│   │   ├── types/              # Backend TypeScript types
│   │   ├── db.ts               # Prisma client singleton
│   │   └── index.ts            # Express app entry point (port 3001)
│   └── tsconfig.json           # CommonJS target, outDir: ./dist
├── prisma/
│   ├── schema.prisma           # Prisma schema (SQLite)
│   └── seed.ts                 # Dev seed script
├── openspec/                   # OpenSpec change management (do not modify manually)
├── package.json                # Root package (type: "module", all scripts here)
├── vite.config.ts              # Remix Vite config + /api proxy to localhost:3001
├── tsconfig.json               # Root TS config (references app and server)
├── tsconfig.app.json           # Frontend TS config
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

# 3. Initialize and migrate the database
npm run db:migrate -- --name init

# 4. Seed development data (creates demo@example.com / change-me123 login)
npm run db:seed
```

## Development

```bash
# Start both frontend (Remix dev, port 5173) and backend (Express, port 3001)
npm run dev

# Start frontend only
npm run dev:client

# Start backend only (tsx watch for hot reload)
npm run dev:server
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`.

## Build

```bash
# Build everything (frontend + backend)
npm run build

# Frontend output: build/  (Remix/Vite build)
# Backend output: server/dist/  (tsc CommonJS bundle)

# Build frontend only
npm run build:client

# Build backend only
npm run build:server
```

## Run in Production

```bash
# After npm run build:
npm run start
# Runs: node ./build/server/index.js
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

After modifying `prisma/schema.prisma`, always run `npm run db:generate` and create a migration.

## Key Conventions

### UI / Styling
- Use shadcn-style shared primitives from `src/components/ui` and Tailwind utility classes for all product UI.
- **Route or feature-specific custom CSS files are disallowed.** Only `app/root.tsx` may import `src/index.css?url` and `src/main.tsx` may import `./index.css`.
- Add new reusable controls to `src/components/ui/` rather than inlining styles.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

### TypeScript
- Root project is `"type": "module"` (ESM). The `server/` subproject uses CommonJS (`"module": "CommonJS"` in `server/tsconfig.json`).
- Do not add `"type": "module"` to `server/package.json` — the server compiles to CommonJS.
- Strict TypeScript is enabled everywhere. Avoid `any`.

### Auth
- Session is stored as an `HttpOnly` cookie set by the Express backend.
- Use `attachAuthUser` middleware for protecting backend routes.
- The frontend uses Remix loaders/actions to check session state via `/api/auth/session`.

### API
- All API routes are prefixed with `/api`.
- Rate limiting is applied globally to `/api` (200 req/min per IP).
- Vehicle and record routes are scoped to the authenticated user.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Prisma SQLite connection string | `file:./prisma/dev.db` |
| `PORT` | Express server port | `3001` |
| `OPENAUTH_SECRET` | Signing secret for session tokens | _(required in production)_ |
| `OPENAUTH_ISSUER` | Token issuer | `vehicle-service-record-openauth` |
| `OPENAUTH_AUDIENCE` | Token audience | `vehicle-service-record-client` |
| `DEV_USER_EMAIL` | Seeded dev login email | `demo@example.com` |
| `DEV_USER_PASSWORD` | Seeded dev login password | `change-me123` |

## CI / Validation

There are no automated tests in this repository. Manual verification steps are documented in `README.md`.

Before submitting changes, always:
1. Run `npm run lint` — fix any ESLint errors.
2. Run `npm run build` — ensure the full build succeeds without errors.
3. For UI changes, verify no custom CSS imports were added: `rg -n "\.css(\?url)?['\"]" app src`

## Common Pitfalls

- **`exports is not defined` error at runtime**: The root `package.json` has `"type": "module"`. The server compiles to CommonJS via `server/tsconfig.json`. Do not mix ESM/CJS in `server/`.
- **Prisma client not found**: Run `npm install` (triggers `postinstall: prisma generate`) or run `npm run db:generate` manually.
- **Port conflicts**: Frontend runs on 5173, backend on 3001. Both must be running for full-stack dev.
- **Missing `.env`**: Copy `.env.example` to `.env` before starting the server.
