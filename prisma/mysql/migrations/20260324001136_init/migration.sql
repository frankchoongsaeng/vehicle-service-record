-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `profile_image_url` VARCHAR(191) NULL,
    `preferred_currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `reminder_email_enabled` BOOLEAN NOT NULL DEFAULT true,
    `reminder_digest_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `image_id` INTEGER NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `trim` VARCHAR(191) NOT NULL,
    `vehicle_type` VARCHAR(191) NULL,
    `plate_number` VARCHAR(191) NULL,
    `vin` VARCHAR(191) NULL,
    `engine` VARCHAR(191) NULL,
    `transmission` VARCHAR(191) NOT NULL,
    `fuel_type` VARCHAR(191) NOT NULL,
    `purchase_mileage` INTEGER NULL,
    `mileage` INTEGER NULL,
    `distance_unit` VARCHAR(191) NOT NULL DEFAULT 'mi',
    `reminder_mode` VARCHAR(191) NOT NULL DEFAULT 'inherit',
    `color` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vehicles_user_id_idx`(`user_id`),
    INDEX `vehicles_image_id_idx`(`image_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `classification_key` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `year_start` INTEGER NOT NULL,
    `year_end` INTEGER NOT NULL,
    `trim` VARCHAR(191) NULL,
    `vehicle_type` VARCHAR(191) NULL,
    `body_style` VARCHAR(191) NULL,
    `view` VARCHAR(191) NOT NULL DEFAULT 'default',
    `generation_key` VARCHAR(191) NULL,
    `prompt_version` VARCHAR(191) NULL,
    `image_storage_key` VARCHAR(191) NOT NULL,
    `local_tmp_filename` VARCHAR(191) NULL,
    `classifier_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `classifier_error` VARCHAR(191) NULL,
    `classified_at` DATETIME(3) NULL,
    `generation_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `generation_error` VARCHAR(191) NULL,
    `upload_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `upload_error` VARCHAR(191) NULL,
    `uploaded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_images_classification_key_key`(`classification_key`),
    UNIQUE INDEX `vehicle_images_image_storage_key_key`(`image_storage_key`),
    INDEX `vehicle_images_make_model_color_idx`(`make`, `model`, `color`),
    INDEX `vehicle_images_year_start_year_end_idx`(`year_start`, `year_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `vehicle_id` INTEGER NOT NULL,
    `maintenance_plan_id` INTEGER NULL,
    `service_type` VARCHAR(191) NOT NULL,
    `workshop` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `mileage` INTEGER NULL,
    `cost` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_records_user_id_idx`(`user_id`),
    INDEX `service_records_vehicle_id_idx`(`vehicle_id`),
    INDEX `service_records_maintenance_plan_id_idx`(`maintenance_plan_id`),
    INDEX `service_records_user_id_vehicle_id_idx`(`user_id`, `vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `vehicle_id` INTEGER NOT NULL,
    `service_type` VARCHAR(191) NOT NULL DEFAULT 'other',
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `interval_months` INTEGER NULL,
    `interval_mileage` INTEGER NULL,
    `last_completed_date` VARCHAR(191) NULL,
    `last_completed_mileage` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `maintenance_plans_user_id_idx`(`user_id`),
    INDEX `maintenance_plans_vehicle_id_idx`(`vehicle_id`),
    INDEX `maintenance_plans_user_id_vehicle_id_idx`(`user_id`, `vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workshops` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workshops_user_id_idx`(`user_id`),
    INDEX `workshops_user_id_name_idx`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `vehicle_id` INTEGER NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `days_threshold` INTEGER NULL,
    `mileage_threshold` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminder_rules_user_id_idx`(`user_id`),
    INDEX `reminder_rules_vehicle_id_idx`(`vehicle_id`),
    INDEX `reminder_rules_user_id_vehicle_id_channel_idx`(`user_id`, `vehicle_id`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `kind` VARCHAR(191) NOT NULL DEFAULT 'maintenance_digest',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `subject` VARCHAR(191) NOT NULL,
    `body_text` VARCHAR(191) NOT NULL,
    `body_html` VARCHAR(191) NOT NULL,
    `dedupe_key` VARCHAR(191) NOT NULL,
    `item_count` INTEGER NOT NULL DEFAULT 0,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `scheduled_for` DATETIME(3) NOT NULL,
    `next_retry_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `last_error` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notifications_dedupe_key_key`(`dedupe_key`),
    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_status_next_retry_at_idx`(`status`, `next_retry_at`),
    INDEX `notifications_scheduled_for_idx`(`scheduled_for`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notification_id` INTEGER NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `provider` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `attempt_number` INTEGER NOT NULL,
    `response` VARCHAR(191) NULL,
    `error` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_attempts_notification_id_idx`(`notification_id`),
    INDEX `delivery_attempts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_image_id_fkey` FOREIGN KEY (`image_id`) REFERENCES `vehicle_images`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_maintenance_plan_id_fkey` FOREIGN KEY (`maintenance_plan_id`) REFERENCES `maintenance_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workshops` ADD CONSTRAINT `workshops_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_rules` ADD CONSTRAINT `reminder_rules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_rules` ADD CONSTRAINT `reminder_rules_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_attempts` ADD CONSTRAINT `delivery_attempts_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
