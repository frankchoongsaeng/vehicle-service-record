-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vehicle_images" (
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
    "local_tmp_filename" TEXT,
    "classifier_status" TEXT NOT NULL DEFAULT 'pending',
    "classifier_error" TEXT,
    "classified_at" DATETIME,
    "generation_status" TEXT NOT NULL DEFAULT 'pending',
    "generation_error" TEXT,
    "upload_status" TEXT NOT NULL DEFAULT 'pending',
    "upload_error" TEXT,
    "uploaded_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_vehicle_images" ("body_style", "classification_key", "color", "created_at", "generation_error", "generation_key", "generation_status", "id", "image_storage_key", "local_tmp_filename", "make", "model", "prompt_version", "trim", "updated_at", "upload_error", "upload_status", "uploaded_at", "vehicle_type", "view", "year_end", "year_start") SELECT "body_style", "classification_key", "color", "created_at", "generation_error", "generation_key", "generation_status", "id", "image_storage_key", "local_tmp_filename", "make", "model", "prompt_version", "trim", "updated_at", "upload_error", "upload_status", "uploaded_at", "vehicle_type", "view", "year_end", "year_start" FROM "vehicle_images";
DROP TABLE "vehicle_images";
ALTER TABLE "new_vehicle_images" RENAME TO "vehicle_images";
CREATE UNIQUE INDEX "vehicle_images_classification_key_key" ON "vehicle_images"("classification_key");
CREATE UNIQUE INDEX "vehicle_images_image_storage_key_key" ON "vehicle_images"("image_storage_key");
CREATE INDEX "vehicle_images_make_model_color_idx" ON "vehicle_images"("make", "model", "color");
CREATE INDEX "vehicle_images_year_start_year_end_idx" ON "vehicle_images"("year_start", "year_end");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
