CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` text,
	`reels_id` text,
	`text` text NOT NULL,
	`analyse_raw_text` text,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reels_id`) REFERENCES `reels_urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`username` text NOT NULL,
	`followers` integer DEFAULT 0 NOT NULL,
	`post_prompt` text NOT NULL,
	`blogger_prompt` text,
	`all_videos` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`redflag` text,
	`is_private` integer DEFAULT false NOT NULL,
	`avatar_url` text,
	`post_number` integer DEFAULT 10 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`analyse_raw_text` text,
	`nickname_analyse_raw_text` text,
	`score` real,
	`avg_income_level` real,
	`avg_age_score` real
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`post_url` text NOT NULL,
	`file_path` text,
	`downloadUrl` text NOT NULL,
	`is_video` integer DEFAULT false NOT NULL,
	`reason` text,
	`job_id` text NOT NULL,
	`analuze_raw_text` text,
	`has_blogger_face` integer DEFAULT false NOT NULL,
	`comment_count` integer DEFAULT 0,
	`comment_er` real DEFAULT 0,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reels_urls` (
	`id` text PRIMARY KEY NOT NULL,
	`reels_url` text NOT NULL,
	`video_url` text,
	`file_path` text,
	`reason` text,
	`transcription` text,
	`job_id` text NOT NULL,
	`analuze_raw_text` text,
	`has_blogger_face` integer DEFAULT false NOT NULL,
	`comment_count` integer DEFAULT 0,
	`comment_er` real DEFAULT 0,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`download_url` text NOT NULL,
	`filepath` text,
	`reason` text,
	`transcription` text,
	`is_video` integer DEFAULT false NOT NULL,
	`job_id` text NOT NULL,
	`analuze_raw_text` text,
	`has_blogger_face` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
