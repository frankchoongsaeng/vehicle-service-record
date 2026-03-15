import { Router, Request, Response } from "express";
import db from "../db";

const router = Router({ mergeParams: true });

// GET /api/vehicles/:vehicleId/records
router.get("/", (req: Request, res: Response) => {
  const vehicle = db
    .prepare(`SELECT id FROM vehicles WHERE id = ?`)
    .get(req.params.vehicleId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const records = db
    .prepare(
      `SELECT * FROM service_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC`
    )
    .all(req.params.vehicleId);
  res.json(records);
});

// GET /api/vehicles/:vehicleId/records/:id
router.get("/:id", (req: Request, res: Response) => {
  const record = db
    .prepare(
      `SELECT * FROM service_records WHERE id = ? AND vehicle_id = ?`
    )
    .get(req.params.id, req.params.vehicleId);
  if (!record) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }
  res.json(record);
});

// POST /api/vehicles/:vehicleId/records
router.post("/", (req: Request, res: Response) => {
  const { service_type, description, date, mileage, cost, notes } =
    req.body as {
      service_type: string;
      description: string;
      date: string;
      mileage?: number;
      cost?: number;
      notes?: string;
    };

  if (!service_type || !description || !date) {
    res
      .status(400)
      .json({ error: "service_type, description, and date are required" });
    return;
  }

  const vehicle = db
    .prepare(`SELECT id FROM vehicles WHERE id = ?`)
    .get(req.params.vehicleId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const stmt = db.prepare(
    `INSERT INTO service_records (vehicle_id, service_type, description, date, mileage, cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    req.params.vehicleId,
    service_type,
    description,
    date,
    mileage ?? null,
    cost ?? null,
    notes ?? null
  );

  const created = db
    .prepare(`SELECT * FROM service_records WHERE id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/vehicles/:vehicleId/records/:id
router.put("/:id", (req: Request, res: Response) => {
  const { service_type, description, date, mileage, cost, notes } =
    req.body as {
      service_type: string;
      description: string;
      date: string;
      mileage?: number;
      cost?: number;
      notes?: string;
    };

  if (!service_type || !description || !date) {
    res
      .status(400)
      .json({ error: "service_type, description, and date are required" });
    return;
  }

  const existing = db
    .prepare(
      `SELECT id FROM service_records WHERE id = ? AND vehicle_id = ?`
    )
    .get(req.params.id, req.params.vehicleId);
  if (!existing) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }

  db.prepare(
    `UPDATE service_records
     SET service_type = ?, description = ?, date = ?, mileage = ?,
         cost = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND vehicle_id = ?`
  ).run(
    service_type,
    description,
    date,
    mileage ?? null,
    cost ?? null,
    notes ?? null,
    req.params.id,
    req.params.vehicleId
  );

  const updated = db
    .prepare(`SELECT * FROM service_records WHERE id = ?`)
    .get(req.params.id);
  res.json(updated);
});

// DELETE /api/vehicles/:vehicleId/records/:id
router.delete("/:id", (req: Request, res: Response) => {
  const existing = db
    .prepare(
      `SELECT id FROM service_records WHERE id = ? AND vehicle_id = ?`
    )
    .get(req.params.id, req.params.vehicleId);
  if (!existing) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }

  db.prepare(
    `DELETE FROM service_records WHERE id = ? AND vehicle_id = ?`
  ).run(req.params.id, req.params.vehicleId);
  res.status(204).send();
});

export default router;
