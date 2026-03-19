# Duralog

Duralog is a web app to track maintenance and service history for your vehicles - accessible from any device.

## Features

- **Manage detailed vehicle profiles** — track name, make, model, year, trim, plate, VIN, engine, transmission, fuel type, mileage, color, and notes
- **Track service records** — oil changes, tire rotations, brake service, battery replacements, and more
- **Rich record details** — service type, date, mileage at service, cost, and notes
- **Cross-device access** — data is stored on the backend server, accessible from any device
- **Comprehensive seed data** — demo vehicles and service records cover dashboards, filters, empty states, and auth isolation checks

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Remix 2 + React 18 + TypeScript     |
| Backend  | Node.js + Express 4 + TypeScript    |
| Database | Prisma ORM + SQLite                 |
| Build    | Vite 6 + Remix Vite plugin          |

## UI Styling Standard

- Product UI must use shadcn-style shared primitives from `src/ui/components/ui` and Tailwind utility classes.
- Route or feature-specific custom CSS files are disallowed for product pages.
- Keep all reusable controls (buttons, cards, inputs, tables, badges, select, textarea) in shared UI primitives and compose from those.

Approved primitives currently include:

- `Button`
- `Card`
- `Input`
- `Textarea`
- `Badge`
- `Table`
- `Select`

## UI Policy Check Guidance

Use ripgrep to verify no custom CSS imports were reintroduced in Remix/source modules:

```bash
rg -n "\\.css(\\?url)?['\"]" src/ui
```

Expected result:

- `src/ui/root.tsx` may import `./index.css?url`
- `src/ui/main.tsx` may import `./index.css`
- No other custom CSS imports should appear

For CI or pre-merge checks, run the same command and fail builds if unexpected matches are found.

## Project Structure

```text
vehicle-service-record/
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── routes/                  # API route handlers
│   └── ui/                      # Remix frontend
│       ├── routes/              # Route modules
│       ├── components/          # Shared and feature UI components
│       ├── api/                 # API client
│       ├── lib/                 # UI helpers and derived maintenance logic
│       └── types/               # Frontend types
├── prisma/
│   ├── schema.prisma            # Prisma schema
│   └── seed.ts                  # Development seed script
├── public/                      # Static assets
├── vite.config.ts               # Remix Vite config
└── package.json                 # Root scripts and dependencies
```

## Getting Started

### 1. Install dependencies (root only)

```bash
npm install
```

The project is a single npm package: one install at the root covers both frontend and backend.

### 2. Initialize the database

```bash
npm run db:migrate -- --name init
npm run db:seed
```

The seed step creates a development login by default:

- Email: `demo@example.com`
- Password: `change-me123`

The seed also creates:

- 4 demo vehicles with varied profile completeness
- 14 service records spanning all supported service types
- one vehicle with no service history for empty-state testing
- a second user, `hidden@example.com`, for auth-scoping checks

Override those values with `DEV_USER_EMAIL` and `DEV_USER_PASSWORD` in your environment if needed.

### 3. Start both frontend and backend

```bash
npm run dev
```

- App and API: <http://localhost:3001>

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Environment

Copy `.env.example` to `.env` and adjust values for your environment.

Important variables:

- `DATABASE_URL`: Prisma SQLite connection string
- `OPENAUTH_SECRET`: signing secret for the login session token
- `OPENAUTH_ISSUER`: token issuer value, defaults to `vehicle-service-record-openauth`
- `OPENAUTH_AUDIENCE`: token audience value, defaults to `vehicle-service-record-client`
- `DEV_USER_EMAIL`: seeded development login email
- `DEV_USER_PASSWORD`: seeded development login password
- `LOG_LEVEL`: backend log threshold, for example `debug`, `info`, `warn`, or `error`
- `LOG_READ_REQUEST_SAMPLE_RATE`: production sampling rate for successful read-request lifecycle logs between `0` and `1`
- `LOG_FILE_PATH`: optional NDJSON backend log file path, useful for searching `requestId` values outside the terminal

## Backend Logging

Backend logs are always written to stdout/stderr as structured JSON.

If you also want persistent searchable logs, set `LOG_FILE_PATH` to an NDJSON file path, for example:

```bash
LOG_FILE_PATH=./logs/backend.ndjson
```

Each line in that file is one JSON log record, so you can grep or ingest it with external tooling while preserving the same `requestId` values emitted by the frontend API client and backend request logger.

## Login Flow

- Unauthenticated users are redirected to `/login`
- Successful sign-in creates an `HttpOnly` session cookie
- Vehicle and service record API routes require an authenticated session and are scoped to the signed-in user
- Use the sign-out button in the main app navbar to clear the current session

## Manual Verification

After running migrations, seed data, and the dev servers, validate the change with this flow:

1. Open `/` and confirm the app redirects to `/login`
2. Try an invalid password and confirm the login page shows an error
3. Sign in with `demo@example.com / change-me123` and confirm the garage loads with multiple vehicles
4. Open at least one seeded vehicle dashboard and confirm summary stats, timeline, upcoming maintenance, and snapshot data render from the database
5. Open the service records route and confirm filtering, detail panel navigation, and the add-record route work
6. Open the seeded vehicle with no service history and confirm empty-state behavior is correct
7. Refresh the page and confirm the session persists
8. Sign out and confirm the session clears and the app returns to `/login`
9. Request `/api/vehicles` without a session and confirm the API returns `401`

## API Endpoints

| Method | Path                                   | Description                     |
| ------ | -------------------------------------- | ------------------------------- |
| GET    | `/api/auth/session`                    | Get current authenticated user  |
| POST   | `/api/auth/login`                      | Sign in with email and password |
| POST   | `/api/auth/logout`                     | Clear the current session       |
| GET    | `/api/vehicles`                        | List all vehicles               |
| POST   | `/api/vehicles`                        | Create a vehicle                |
| PUT    | `/api/vehicles/:id`                    | Update a vehicle                |
| DELETE | `/api/vehicles/:id`                    | Delete a vehicle                |
| GET    | `/api/vehicles/:vehicleId/records`     | List service records            |
| POST   | `/api/vehicles/:vehicleId/records`     | Add a service record            |
| PUT    | `/api/vehicles/:vehicleId/records/:id` | Update a service record         |
| DELETE | `/api/vehicles/:vehicleId/records/:id` | Delete a service record         |
| GET    | `/api/health`                          | Health check                    |

## Building for Production

```bash
npm run build
# frontend output: dist/ui/
# backend output: dist/
```

## Version Scope

### Snapshot (Development)

Use the snapshot scope when working on active development. Both servers run with hot-reload:

```bash
# Install dependencies
npm install

# Initialize and seed the database (first time only)
npm run db:migrate -- --name init
npm run db:seed

# Start the development server (serves both Remix UI and API)
npm run dev
```

The Express development server runs on port `3001` and serves both the Remix UI and `/api` routes from the same process.

### Working (Production)

Use the working scope to validate a production-ready build before deploying:

```bash
# Build both frontend and backend
npm run build

# Start the production server
npm run start
```

The `start` script runs `node ./dist/index.js`. Ensure all required environment variables, especially `DATABASE_URL` and `OPENAUTH_SECRET`, are set before running in production.
