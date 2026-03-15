# Vehicle Service Record

A web app to track maintenance and service history for your vehicles — accessible from any device.

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

## Project Structure

```
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
```

### 3. Start both frontend and backend

```bash
npm run dev
```

- Frontend (Remix dev): http://localhost:5173
- Backend API (Express): http://localhost:3001

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Endpoints

| Method | Path                                        | Description                  |
|--------|---------------------------------------------|------------------------------|
| GET    | `/api/vehicles`                             | List all vehicles            |
| POST   | `/api/vehicles`                             | Create a vehicle             |
| PUT    | `/api/vehicles/:id`                         | Update a vehicle             |
| DELETE | `/api/vehicles/:id`                         | Delete a vehicle             |
| GET    | `/api/vehicles/:vehicleId/records`          | List service records         |
| POST   | `/api/vehicles/:vehicleId/records`          | Add a service record         |
| PUT    | `/api/vehicles/:vehicleId/records/:id`      | Update a service record      |
| DELETE | `/api/vehicles/:vehicleId/records/:id`      | Delete a service record      |
| GET    | `/api/health`                               | Health check                 |

## Building for Production

```bash
npm run build
# frontend output: build/
# backend output: server/dist/
```
