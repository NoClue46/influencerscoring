ALTER TABLE `jobs` ADD `stories_enriched` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `source` text DEFAULT 'highlights' NOT NULL;