import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

// GET /api/vehicles
router.get("/", (_req: Request, res: Response) => {
  const vehicles = db
    .prepare(
      `SELECT * FROM vehicles ORDER BY make ASC, model ASC, year DESC`
    )
    .all();
  res.json(vehicles);
});

// GET /api/vehicles/:id
router.get("/:id", (req: Request, res: Response) => {
  const vehicle = db
    .prepare(`SELECT * FROM vehicles WHERE id = ?`)
    .get(req.params.id);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(vehicle);
});

// POST /api/vehicles
router.post("/", (req: Request, res: Response) => {
  const { make, model, year, vin, mileage, color, notes } = req.body as {
    make: string;
    model: string;
    year: number;
    vin?: string;
    mileage?: number;
    color?: string;
    notes?: string;
  };

  if (!make || !model || !year) {
    res.status(400).json({ error: "make, model, and year are required" });
    return;
  }

  const stmt = db.prepare(
    `INSERT INTO vehicles (make, model, year, vin, mileage, color, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    make,
    model,
    year,
    vin ?? null,
    mileage ?? null,
    color ?? null,
    notes ?? null
  );

  const created = db
    .prepare(`SELECT * FROM vehicles WHERE id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/vehicles/:id
router.put("/:id", (req: Request, res: Response) => {
  const { make, model, year, vin, mileage, color, notes } = req.body as {
    make: string;
    model: string;
    year: number;
    vin?: string;
    mileage?: number;
    color?: string;
    notes?: string;
  };

  if (!make || !model || !year) {
    res.status(400).json({ error: "make, model, and year are required" });
    return;
  }

  const existing = db
    .prepare(`SELECT id FROM vehicles WHERE id = ?`)
    .get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  db.prepare(
    `UPDATE vehicles
     SET make = ?, model = ?, year = ?, vin = ?, mileage = ?,
         color = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    make,
    model,
    year,
    vin ?? null,
    mileage ?? null,
    color ?? null,
    notes ?? null,
    req.params.id
  );

  const updated = db
    .prepare(`SELECT * FROM vehicles WHERE id = ?`)
    .get(req.params.id);
  res.json(updated);
});

// DELETE /api/vehicles/:id
router.delete("/:id", (req: Request, res: Response) => {
  const existing = db
    .prepare(`SELECT id FROM vehicles WHERE id = ?`)
    .get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  db.prepare(`DELETE FROM vehicles WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

export default router;
