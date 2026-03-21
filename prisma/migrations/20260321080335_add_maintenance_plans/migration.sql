-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "maintenance_plan_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "maintenance_plan_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "maintenance_plan_items_maintenance_plan_id_fkey" FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "maintenance_plans_user_id_idx" ON "maintenance_plans"("user_id");

-- CreateIndex
CREATE INDEX "maintenance_plans_vehicle_id_idx" ON "maintenance_plans"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_plans_user_id_vehicle_id_idx" ON "maintenance_plans"("user_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_plan_items_maintenance_plan_id_idx" ON "maintenance_plan_items"("maintenance_plan_id");
