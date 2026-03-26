PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_subject" TEXT,
    "email_verified_at" DATETIME,
    "email_verification_token_hash" TEXT,
    "email_verification_expires_at" DATETIME,
    "email_verification_sent_at" DATETIME,
    "password_reset_token_hash" TEXT,
    "password_reset_expires_at" DATETIME,
    "password_reset_sent_at" DATETIME,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "profile_image_url" TEXT,
    "preferred_currency" TEXT NOT NULL DEFAULT 'USD',
    "history_sort_order" TEXT NOT NULL DEFAULT 'newest_first',
    "reminder_email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "new_users" (
    "id",
    "email",
    "password_hash",
    "email_verified_at",
    "email_verification_token_hash",
    "email_verification_expires_at",
    "email_verification_sent_at",
    "password_reset_token_hash",
    "password_reset_expires_at",
    "password_reset_sent_at",
    "first_name",
    "last_name",
    "country",
    "profile_image_url",
    "preferred_currency",
    "history_sort_order",
    "reminder_email_enabled",
    "reminder_digest_enabled",
    "onboarding_completed_at",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "email",
    "password_hash",
    "email_verified_at",
    "email_verification_token_hash",
    "email_verification_expires_at",
    "email_verification_sent_at",
    "password_reset_token_hash",
    "password_reset_expires_at",
    "password_reset_sent_at",
    "first_name",
    "last_name",
    "country",
    "profile_image_url",
    "preferred_currency",
    "history_sort_order",
    "reminder_email_enabled",
    "reminder_digest_enabled",
    "onboarding_completed_at",
    "created_at",
    "updated_at"
FROM "users";

DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");
CREATE UNIQUE INDEX "users_email_verification_token_hash_key" ON "users"("email_verification_token_hash");
CREATE UNIQUE INDEX "users_password_reset_token_hash_key" ON "users"("password_reset_token_hash");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
