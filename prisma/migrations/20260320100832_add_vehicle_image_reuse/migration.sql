-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classification_key" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "year_start" INTEGER NOT NULL,
    "year_end" INTEGER NOT NULL,
    "trim" TEXT,
    "vehicle_type" TEXT,
    "body_style" TEXT,
    "view" TEXT NOT NULL DEFAULT 'default',
    "generation_key" TEXT,
    "prompt_version" TEXT,
    "image_storage_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "image_id" INTEGER,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "trim" TEXT NOT NULL,
    "vehicle_type" TEXT,
    "plate_number" TEXT,
    "vin" TEXT,
    "engine" TEXT,
    "transmission" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "purchase_mileage" INTEGER,
    "mileage" INTEGER,
    "color" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vehicles_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "vehicle_images" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("color", "created_at", "engine", "fuel_type", "id", "make", "mileage", "model", "notes", "plate_number", "purchase_mileage", "transmission", "trim", "updated_at", "user_id", "vehicle_type", "vin", "year") SELECT "color", "created_at", "engine", "fuel_type", "id", "make", "mileage", "model", "notes", "plate_number", "purchase_mileage", "transmission", "trim", "updated_at", "user_id", "vehicle_type", "vin", "year" FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE INDEX "vehicles_user_id_idx" ON "vehicles"("user_id");
CREATE INDEX "vehicles_image_id_idx" ON "vehicles"("image_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_images_classification_key_key" ON "vehicle_images"("classification_key");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_images_image_storage_key_key" ON "vehicle_images"("image_storage_key");

-- CreateIndex
CREATE INDEX "vehicle_images_make_model_color_idx" ON "vehicle_images"("make", "model", "color");

-- CreateIndex
CREATE INDEX "vehicle_images_year_start_year_end_idx" ON "vehicle_images"("year_start", "year_end");
