-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_maintenance_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "service_type" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "interval_months" INTEGER,
    "interval_mileage" INTEGER,
    "last_completed_date" TEXT,
    "last_completed_mileage" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "maintenance_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_plans_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_maintenance_plans" ("created_at", "description", "id", "interval_mileage", "interval_months", "last_completed_date", "last_completed_mileage", "service_type", "title", "updated_at", "user_id", "vehicle_id")
SELECT
    "created_at",
    "description",
    "id",
    "interval_mileage",
    "interval_months",
    "last_completed_date",
    "last_completed_mileage",
    COALESCE(
        (
            SELECT CASE
                WHEN lower("maintenance_plan_items"."name") LIKE '%oil%' THEN 'oil_change'
                WHEN lower("maintenance_plan_items"."name") LIKE '%rotate%' OR lower("maintenance_plan_items"."name") LIKE '%rotation%' THEN 'tire_rotation'
                WHEN lower("maintenance_plan_items"."name") LIKE '%brake%' THEN 'brake_service'
                WHEN lower("maintenance_plan_items"."name") LIKE '%tire replacement%' OR lower("maintenance_plan_items"."name") LIKE '%tyre replacement%' OR lower("maintenance_plan_items"."name") LIKE '%new tire%' OR lower("maintenance_plan_items"."name") LIKE '%new tyre%' THEN 'tire_replacement'
                WHEN lower("maintenance_plan_items"."name") LIKE '%battery%' THEN 'battery'
                WHEN lower("maintenance_plan_items"."name") LIKE '%cabin filter%' THEN 'cabin_filter'
                WHEN lower("maintenance_plan_items"."name") LIKE '%air filter%' THEN 'air_filter'
                WHEN lower("maintenance_plan_items"."name") LIKE '%transmission%' OR lower("maintenance_plan_items"."name") LIKE '%gearbox%' THEN 'transmission'
                WHEN lower("maintenance_plan_items"."name") LIKE '%coolant%' OR lower("maintenance_plan_items"."name") LIKE '%radiator fluid%' THEN 'coolant'
                WHEN lower("maintenance_plan_items"."name") LIKE '%spark plug%' THEN 'spark_plugs'
                WHEN lower("maintenance_plan_items"."name") LIKE '%timing belt%' OR lower("maintenance_plan_items"."name") LIKE '%timing chain%' THEN 'timing_belt'
                WHEN lower("maintenance_plan_items"."name") LIKE '%wiper%' THEN 'wiper_blades'
                WHEN lower("maintenance_plan_items"."name") LIKE '%inspection%' OR lower("maintenance_plan_items"."name") LIKE '%checkup%' OR lower("maintenance_plan_items"."name") LIKE '%check-up%' THEN 'inspection'
                ELSE 'other'
            END
            FROM "maintenance_plan_items"
            WHERE "maintenance_plan_items"."maintenance_plan_id" = "maintenance_plans"."id"
            ORDER BY "maintenance_plan_items"."created_at" ASC, "maintenance_plan_items"."id" ASC
            LIMIT 1
        ),
        'other'
    ),
    "title",
    "updated_at",
    "user_id",
    "vehicle_id"
FROM "maintenance_plans";
DROP TABLE "maintenance_plans";
ALTER TABLE "new_maintenance_plans" RENAME TO "maintenance_plans";
CREATE INDEX "maintenance_plans_user_id_idx" ON "maintenance_plans"("user_id");
CREATE INDEX "maintenance_plans_vehicle_id_idx" ON "maintenance_plans"("vehicle_id");
CREATE INDEX "maintenance_plans_user_id_vehicle_id_idx" ON "maintenance_plans"("user_id", "vehicle_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
