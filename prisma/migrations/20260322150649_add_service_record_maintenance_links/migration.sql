-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "maintenance_plan_id" INTEGER,
    "maintenance_plan_item_id" INTEGER,
    "service_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mileage" INTEGER,
    "cost" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "service_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_records_maintenance_plan_id_fkey" FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_records_maintenance_plan_item_id_fkey" FOREIGN KEY ("maintenance_plan_item_id") REFERENCES "maintenance_plan_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_service_records" ("cost", "created_at", "date", "description", "id", "mileage", "notes", "service_type", "updated_at", "user_id", "vehicle_id") SELECT "cost", "created_at", "date", "description", "id", "mileage", "notes", "service_type", "updated_at", "user_id", "vehicle_id" FROM "service_records";
DROP TABLE "service_records";
ALTER TABLE "new_service_records" RENAME TO "service_records";
CREATE INDEX "service_records_user_id_idx" ON "service_records"("user_id");
CREATE INDEX "service_records_vehicle_id_idx" ON "service_records"("vehicle_id");
CREATE INDEX "service_records_maintenance_plan_id_idx" ON "service_records"("maintenance_plan_id");
CREATE INDEX "service_records_maintenance_plan_item_id_idx" ON "service_records"("maintenance_plan_item_id");
CREATE INDEX "service_records_user_id_vehicle_id_idx" ON "service_records"("user_id", "vehicle_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
