-- CreateTable
CREATE TABLE "reminder_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "days_threshold" INTEGER,
    "mileage_threshold" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reminder_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reminder_rules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "kind" TEXT NOT NULL DEFAULT 'maintenance_digest',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" DATETIME NOT NULL,
    "next_retry_at" DATETIME,
    "sent_at" DATETIME,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notification_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "response" TEXT,
    "error" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "profile_image_url" TEXT,
    "preferred_currency" TEXT NOT NULL DEFAULT 'USD',
    "reminder_email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("country", "created_at", "email", "first_name", "id", "last_name", "password_hash", "preferred_currency", "profile_image_url", "updated_at") SELECT "country", "created_at", "email", "first_name", "id", "last_name", "password_hash", "preferred_currency", "profile_image_url", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
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
    "distance_unit" TEXT NOT NULL DEFAULT 'mi',
    "reminder_mode" TEXT NOT NULL DEFAULT 'inherit',
    "color" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vehicles_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "vehicle_images" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("color", "created_at", "distance_unit", "engine", "fuel_type", "id", "image_id", "make", "mileage", "model", "notes", "plate_number", "purchase_mileage", "transmission", "trim", "updated_at", "user_id", "vehicle_type", "vin", "year") SELECT "color", "created_at", "distance_unit", "engine", "fuel_type", "id", "image_id", "make", "mileage", "model", "notes", "plate_number", "purchase_mileage", "transmission", "trim", "updated_at", "user_id", "vehicle_type", "vin", "year" FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE INDEX "vehicles_user_id_idx" ON "vehicles"("user_id");
CREATE INDEX "vehicles_image_id_idx" ON "vehicles"("image_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "reminder_rules_user_id_idx" ON "reminder_rules"("user_id");

-- CreateIndex
CREATE INDEX "reminder_rules_vehicle_id_idx" ON "reminder_rules"("vehicle_id");

-- CreateIndex
CREATE INDEX "reminder_rules_user_id_vehicle_id_channel_idx" ON "reminder_rules"("user_id", "vehicle_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_next_retry_at_idx" ON "notifications"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_idx" ON "notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "delivery_attempts_notification_id_idx" ON "delivery_attempts"("notification_id");

-- CreateIndex
CREATE INDEX "delivery_attempts_status_idx" ON "delivery_attempts"("status");
