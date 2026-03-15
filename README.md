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
| Frontend | React 19 + TypeScript + Vite    |
| Backend  | Node.js + Express 5             |
| Database | SQLite (via better-sqlite3)     |

## Project Structure

```
vehicle-service-record/
├── src/               # React frontend
│   ├── api/           # API client (fetch wrapper)
│   ├── components/    # UI components
│   ├── types/         # Shared TypeScript types
│   ├── App.tsx        # Main app with view routing
│   └── main.tsx       # React entry point
├── server/            # Express backend
│   └── src/
│       ├── db.ts      # SQLite setup & schema
│       ├── index.ts   # Server entry point
│       └── routes/
│           ├── vehicles.ts  # Vehicle CRUD
│           └── records.ts   # Service record CRUD
└── vite.config.ts     # Vite config (with /api proxy)
```

## Getting Started

### 1. Start the backend

```bash
cd server
npm install
npm run dev      # starts on http://localhost:3001
```

### 2. Start the frontend

```bash
# from the project root
npm install
npm run dev      # starts on http://localhost:5173
```

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
# Build the frontend
npm run build          # outputs to dist/

# Build the server
cd server && npm run build   # outputs to server/dist/
```
