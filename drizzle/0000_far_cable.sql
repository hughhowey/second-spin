CREATE TABLE `ai_usage` (
	`usage_key` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`encrypted_tokens` text
);
--> statement-breakpoint
CREATE TABLE `spotify_exports` (
	`export_key` text PRIMARY KEY NOT NULL,
	`result` text,
	`created_at` text NOT NULL
);
