# Duralog

Duralog is a web app to track maintenance and service history for your vehicles - accessible from any device.

## Features

- **Manage multiple vehicles** — add make, model, year, color, mileage, and VIN
- **Track service records** — oil changes, tire rotations, brake service, battery replacements, and more
- **Rich record details** — service type, date, mileage at service, cost, and notes
- **Cross-device access** — data is stored on the backend server, accessible from any device

## Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Frontend | Remix + React 19 + TypeScript   |
| Backend  | Node.js + Express 5             |
| Database | Prisma ORM + SQLite             |

## UI Styling Standard

- Product UI must use shadcn-style shared primitives from `src/components/ui` and Tailwind utility classes.
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
rg -n "\\.css(\\?url)?['\"]" app src
```

Expected result:

- `app/root.tsx` may import `src/index.css?url`
- `src/main.tsx` may import `./index.css` for standalone local mounting
- No other custom CSS imports should appear

For CI or pre-merge checks, run the same command and fail builds if unexpected matches are found.

## Project Structure

```text
vehicle-service-record/
├── app/               # Remix app routes and document shell
├── src/               # Shared React UI modules used by routes
│   ├── api/           # API client (fetch wrapper)
│   ├── components/    # UI components
│   ├── types/         # Shared TypeScript types
│   └── App.tsx        # Main app with view routing
├── prisma/            # Prisma schema
├── server/            # Express backend
│   └── src/
│       ├── db.ts      # Prisma client singleton
│       ├── index.ts   # Server entry point
│       └── routes/
│           ├── vehicles.ts  # Vehicle CRUD
│           └── records.ts   # Service record CRUD
└── vite.config.ts     # Remix Vite config (with /api proxy)
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

Override those values with `DEV_USER_EMAIL` and `DEV_USER_PASSWORD` in your environment if needed.

### 3. Start both frontend and backend

```bash
npm run dev
```

- Frontend (Remix dev): <http://localhost:5173>
- Backend API (Express): <http://localhost:3001>

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment

Copy `.env.example` to `.env` and adjust values for your environment.

Important variables:

- `DATABASE_URL`: Prisma SQLite connection string
- `OPENAUTH_SECRET`: signing secret for the login session token
- `OPENAUTH_ISSUER`: token issuer value, defaults to `vehicle-service-record-openauth`
- `OPENAUTH_AUDIENCE`: token audience value, defaults to `vehicle-service-record-client`
- `DEV_USER_EMAIL`: seeded development login email
- `DEV_USER_PASSWORD`: seeded development login password

## Login Flow

- Unauthenticated users are redirected to `/login`
- Successful sign-in creates an `HttpOnly` session cookie
- Vehicle and service record API routes require an authenticated session and are scoped to the signed-in user
- Use the sign-out button in the main app navbar to clear the current session

## Manual Verification

After running migrations, seed data, and the dev servers, validate the change with this flow:

1. Open `/` and confirm the app redirects to `/login`
2. Try an invalid password and confirm the login page shows an error
3. Sign in with the seeded account and confirm the main application loads
4. Refresh the page and confirm the session persists
5. Sign out and confirm the session clears and the app returns to `/login`
6. Request `/api/vehicles` without a session and confirm the API returns `401`

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
# frontend output: build/
# backend output: server/dist/
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

# Start both frontend (port 5173) and backend (port 3001) with hot-reload
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`, so all API calls resolve automatically during development.

### Working (Production)

Use the working scope to validate a production-ready build before deploying:

```bash
# Build both frontend and backend
npm run build

# Start the production server (serves Remix SSR + API on the same process)
npm run start
```

The `start` script runs `node ./build/server/index.js`, which is the Remix server entry compiled by the Vite build. Ensure all required environment variables (especially `DATABASE_URL` and `OPENAUTH_SECRET`) are set before running in production.
