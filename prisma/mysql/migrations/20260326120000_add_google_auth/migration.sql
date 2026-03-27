ALTER TABLE `users`
    MODIFY `password_hash` VARCHAR(191) NULL,
    ADD COLUMN `google_subject` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_google_subject_key` ON `users`(`google_subject`);