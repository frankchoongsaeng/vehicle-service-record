ALTER TABLE "users" ADD COLUMN "history_sort_order" TEXT NOT NULL DEFAULT 'newest_first';
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" DATETIME;

UPDATE "users"
SET "onboarding_completed_at" = CURRENT_TIMESTAMP
WHERE "onboarding_completed_at" IS NULL;