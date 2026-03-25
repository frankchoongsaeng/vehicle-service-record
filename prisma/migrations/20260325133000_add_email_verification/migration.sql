-- Alter users to support email verification workflow.
ALTER TABLE "users" ADD COLUMN "email_verified_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "email_verification_token_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "email_verification_sent_at" DATETIME;

CREATE UNIQUE INDEX "users_email_verification_token_hash_key" ON "users"("email_verification_token_hash");