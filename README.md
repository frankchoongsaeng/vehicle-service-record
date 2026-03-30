# Duralog

Duralog is a web app to track maintenance and service history for your vehicles - accessible from any device.

## Features

- **Manage detailed vehicle profiles** — track name, make, model, year, trim, vehicle type, plate, VIN, engine, transmission, fuel type, mileage, color, and notes
- **Track service records** — oil changes, tire rotations, brake service, battery replacements, and more
- **Rich record details** — service type, date, mileage at service, cost, and notes
- **Manage workshop contacts** — keep a reusable directory of workshop names, addresses, and phone numbers
- **Email reminder digests** — evaluate maintenance plans daily, queue due and overdue reminders, and retry delivery with logged attempts
- **Email verification workflow** — new signups are asked to verify their email before reminder delivery and other email-based services are enabled
- **Google sign-in** — start or link an account with Google while still using the existing session and onboarding flow
- **Cross-device access** — data is stored on the backend server, accessible from any device
- **Comprehensive seed data** — demo vehicles and service records cover dashboards, filters, empty states, and auth isolation checks
- **Workshop-ready development data** — seeded workshops populate the workshop directory and service-record suggestions immediately

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Remix 2 + React 18 + TypeScript     |
| Backend  | Node.js + Express 4 + TypeScript    |
| Database | Prisma ORM + MySQL                  |
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
│   ├── migrations/              # Prisma migration history
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
docker compose up -d mysql
npm run db:migrate -- --name init
npm run db:seed
```

The default `.env.example` points Prisma at the local MySQL instance exposed on `127.0.0.1:3306`.

The seed step creates a development login by default:

- Email: `demo@example.com`
- Password: `change-me123`

The seed also creates:

- 4 demo vehicles with varied profile completeness
- 14 service records spanning all supported service types
- 6 demo workshops used by the seeded service records
- one vehicle with no service history for empty-state testing
- a second user, `hidden@example.com`, for auth-scoping checks

Override those values with `DEV_USER_EMAIL` and `DEV_USER_PASSWORD` in your environment if needed.

### 3. Start both frontend and backend

```bash
npm run dev
```

- App and API: <http://localhost:3001>

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Run With Docker Compose and MySQL

The repository includes a Compose stack that starts both MySQL and the application.

1. Copy `.env.example` to `.env` if you have not already.
2. Set at least `OPENAUTH_SECRET` in `.env`.
3. Optionally set `SEED_ON_STARTUP=true` in `.env` if you want demo data loaded automatically.
4. Start the stack:

```bash
docker compose up --build
```

What the app container does on startup:

- regenerates the Prisma client for MySQL
- applies MySQL migrations with `prisma migrate deploy`
- optionally runs `npm run db:seed` when `SEED_ON_STARTUP=true`
- starts the production server on <http://localhost:3001>

The bundled MySQL instance is available on `localhost:3306` with these development credentials:

- database: `duralog`
- user: `duralog`
- password: `duralog`
- root password: `root`

To stop the stack:

```bash
docker compose down
```

To stop it and remove the persisted MySQL volume:

```bash
docker compose down -v
```

## Environment

Copy `.env.example` to `.env` and adjust values for your environment.

Important variables:

- Database
- `DATABASE_URL`: MySQL connection string, for example `mysql://user:password@127.0.0.1:3306/duralog`

- Auth
- `OPENAUTH_SECRET`: signing secret for the login session token
- `OPENAUTH_ISSUER`: token issuer value, defaults to `vehicle-service-record-openauth`
- `OPENAUTH_AUDIENCE`: token audience value, defaults to `vehicle-service-record-client`
- `GOOGLE_OAUTH_CLIENT_ID`: OAuth client ID for Google sign-in
- `GOOGLE_OAUTH_CLIENT_SECRET`: OAuth client secret for Google sign-in

- App links and account email flows
- `APP_ORIGIN`: optional canonical app origin used when generating email verification links; defaults to the incoming request origin
- Google OAuth callback URL: configure `${APP_ORIGIN or current origin}/api/auth/google/callback` in the Google Cloud console. For local development this is usually `http://localhost:3001/api/auth/google/callback`.
- `EMAIL_VERIFICATION_TTL_HOURS`: how long verification links stay valid, defaults to `24`
- `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`: minimum delay between resend requests, defaults to `60`
- `PASSWORD_RESET_TTL_HOURS`: how long password reset links stay valid, defaults to `2`
- `PASSWORD_RESET_RESEND_COOLDOWN_SECONDS`: minimum delay between password reset requests, defaults to `60`

- Development seed user
- `DEV_USER_EMAIL`: seeded development login email
- `DEV_USER_PASSWORD`: seeded development login password

- Logging
- `LOG_LEVEL`: backend log threshold, for example `debug`, `info`, `warn`, or `error`
- `LOG_READ_REQUEST_SAMPLE_RATE`: production sampling rate for successful read-request lifecycle logs between `0` and `1`
- `LOG_FILE_PATH`: optional NDJSON backend log file path, useful for searching `requestId` values outside the terminal

- Bugsink monitoring
- `BUGSINK_ENABLED`: enable or disable server-side Bugsink reporting, defaults to `true`
- `BUGSINK_DSN`: Bugsink project DSN for backend events; Bugsink is Sentry-SDK compatible so standard Sentry JavaScript SDK DSNs work
- `BUGSINK_ENVIRONMENT`: server-side monitoring environment label, defaults to the current `NODE_ENV`
- `BUGSINK_TRACES_SAMPLE_RATE`: backend trace sampling rate between `0` and `1`, defaults to `0.15`
- `BUGSINK_PROFILES_SAMPLE_RATE`: backend profiling sample rate between `0` and `1`, defaults to `0`
- `VITE_BUGSINK_ENABLED`: enable or disable browser-side Bugsink reporting, defaults to `true`
- `VITE_BUGSINK_DSN`: Bugsink project DSN for frontend events
- `VITE_BUGSINK_ENVIRONMENT`: browser monitoring environment label, defaults to the current Vite mode
- `VITE_BUGSINK_TRACES_SAMPLE_RATE`: browser trace sampling rate between `0` and `1`, defaults to `0.15`
- `VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE`: browser replay sampling rate for normal sessions, defaults to `0`
- `VITE_BUGSINK_REPLAYS_ON_ERROR_SAMPLE_RATE`: browser replay sampling rate when an error occurs, defaults to `1`

- Reminder scheduler and alerts
- `REMINDER_SCHEDULER_ENABLED`: enable or disable the reminder scheduler, defaults to `true`
- `REMINDER_RUN_ON_STARTUP`: run reminder evaluation when the server boots, defaults to `true`
- `REMINDER_EVALUATION_HOUR_UTC`: daily UTC hour for maintenance digest evaluation, defaults to `8`
- `REMINDER_RETRY_INTERVAL_MINUTES`: cadence for retrying queued reminder notifications, defaults to `15`
- `REMINDER_RETRY_BACKOFF_MINUTES`: base backoff between failed delivery attempts, defaults to `15`
- `REMINDER_MAX_RETRIES`: maximum delivery attempts before a reminder stays failed, defaults to `3`

- SMTP transport
- `SMTP_HOST`: optional SMTP host used for real email delivery; if unset, reminder emails are logged locally instead of sent
- `SMTP_PORT`: SMTP port, defaults to `587`
- `SMTP_SECURE`: set to `true` for implicit TLS SMTP transports
- `SMTP_USER`: optional SMTP username
- `SMTP_PASS`: optional SMTP password
- `SMTP_FROM`: fallback sender address used when a category-specific sender is not set
- `SMTP_FROM_ALERTS`: sender address for reminder and alert emails
- `SMTP_FROM_SECURITY`: sender address for password resets and other security-sensitive emails
- `SMTP_FROM_WELCOME`: sender address for welcome and email verification emails

- AI image services
- `OPENAI_API_KEY`: required for the async vehicle image generation service
- `OPENAI_IMAGE_MODEL`: optional OpenAI image model override, defaults to `gpt-image-1`
- `OPENAI_IMAGE_CLASSIFIER_MODEL`: optional OpenAI model override for the image classifier service, defaults to `gpt-4.1-mini`

- Bunny storage
- `BUNNY_STORAGE_ZONE_NAME`: Bunny Storage zone name used by the image upload service
- `BUNNY_STORAGE_ACCESS_KEY`: Bunny Storage API access key used by the image upload service
- `BUNNY_STORAGE_REGION`: Bunny Storage region identifier, defaults to `Falkenstein`
- `BUNNY_PUBLIC_BASE_URL`: public base URL used to deliver uploaded vehicle images to the browser, for example `https://media.example.com`

## Backend Logging

Backend logs are always written to stdout/stderr as structured JSON.

If you also want persistent searchable logs, set `LOG_FILE_PATH` to an NDJSON file path, for example:

```bash
LOG_FILE_PATH=./logs/backend.ndjson
```

Each line in that file is one JSON log record, so you can grep or ingest it with external tooling while preserving the same `requestId` values emitted by the frontend API client and backend request logger.

Reminder delivery attempts are also recorded in the database, so you can inspect notification status, retry counts, and provider responses without relying only on stdout logs.

## Bugsink Monitoring

The app now supports Bugsink on both the Express backend and the Remix frontend using the standard Sentry JavaScript SDKs.

What is captured:

- backend request failures, uncaught exceptions, unhandled promise rejections, Prisma and Express traces, and reminder scheduler failures
- explicit spans around billing checkout and subscription sync, OpenAI image classification and generation, VIN decoding, and outbound email delivery
- frontend route-change breadcrumbs, API request breadcrumbs, distributed tracing headers, session user context, and network or server-side API failures
- correlated domain breadcrumbs from the existing structured logger so Bugsink issues include recent auth, billing, reminder, vehicle, and workshop events

Minimal setup:

```bash
BUGSINK_DSN="https://<key>@bugsink.example.com/<project-id>"
VITE_BUGSINK_DSN="https://<key>@bugsink.example.com/<project-id>"
```

If you also want browser replays for error investigations, raise `VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE` above `0`. Replays are configured with masked text and blocked media by default.

## Database

The app uses MySQL only.

Example connection string:

```bash
DATABASE_URL="mysql://user:password@127.0.0.1:3306/duralog"
```

Notes:

- The backend runtime, Prisma CLI commands, and `npm run db:seed` all use the same MySQL `DATABASE_URL`.
- Prisma schema and migrations now live in the default locations: `prisma/schema.prisma` and `prisma/migrations`.
- When bootstrapping locally, start MySQL before running `npm run db:migrate`.

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
6. Open the workshops page from the hamburger menu, create a workshop, edit it, and confirm the saved address and phone number reload correctly
7. Open Settings, set reminder day and mileage thresholds, and confirm the preferences save without errors
8. Edit a vehicle and set its reminder override to `custom` or `disabled`, then confirm the form saves and reloads the same mode
9. If SMTP is not configured, check the server logs after startup and confirm the reminder scheduler logs a digest preview instead of failing
10. Open the seeded vehicle with no service history and confirm empty-state behavior is correct
11. Refresh the page and confirm the session persists
12. Sign out and confirm the session clears and the app returns to `/login`
13. Request `/api/vehicles` without a session and confirm the API returns `401`

## API Endpoints

| Method | Path                                   | Description                        |
| ------ | -------------------------------------- | ---------------------------------- |
| GET    | `/api/auth/session`                    | Get current authenticated user     |
| POST   | `/api/auth/login`                      | Sign in with email and password    |
| POST   | `/api/auth/logout`                     | Clear the current session          |
| GET    | `/api/reminders/preferences`           | Get workspace reminder defaults    |
| PUT    | `/api/reminders/preferences`           | Update workspace reminder defaults |
| GET    | `/api/reminders/vehicles/:vehicleId`   | Get vehicle reminder override      |
| PUT    | `/api/reminders/vehicles/:vehicleId`   | Update vehicle reminder override   |
| GET    | `/api/workshops`                       | List saved workshops               |
| POST   | `/api/workshops`                       | Create a workshop                  |
| PUT    | `/api/workshops/:id`                   | Update a workshop                  |
| DELETE | `/api/workshops/:id`                   | Delete a workshop                  |
| GET    | `/api/vehicles`                        | List all vehicles                  |
| POST   | `/api/vehicles`                        | Create a vehicle                   |
| PUT    | `/api/vehicles/:id`                    | Update a vehicle                   |
| DELETE | `/api/vehicles/:id`                    | Delete a vehicle                   |
| GET    | `/api/vehicles/:vehicleId/records`     | List service records               |
| POST   | `/api/vehicles/:vehicleId/records`     | Add a service record               |
| PUT    | `/api/vehicles/:vehicleId/records/:id` | Update a service record            |
| DELETE | `/api/vehicles/:vehicleId/records/:id` | Delete a service record            |
| GET    | `/api/health`                          | Health check                       |

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
