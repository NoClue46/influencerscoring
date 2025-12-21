-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "post_prompt" TEXT NOT NULL,
    "blogger_prompt" TEXT,
    "all_videos" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "post_number" INTEGER NOT NULL DEFAULT 10,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "analyse_raw_text" TEXT,
    "nickname_analyse_raw_text" TEXT
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_url" TEXT NOT NULL,
    "file_path" TEXT,
    "downloadUrl" TEXT NOT NULL,
    "is_video" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "job_id" TEXT NOT NULL,
    "analuze_raw_text" TEXT,
    "comment_count" INTEGER DEFAULT 0,
    "comment_rate" REAL DEFAULT 0,
    CONSTRAINT "posts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reels_urls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reels_url" TEXT NOT NULL,
    "video_url" TEXT,
    "file_path" TEXT,
    "reason" TEXT,
    "transcription" TEXT,
    "job_id" TEXT NOT NULL,
    "analuze_raw_text" TEXT,
    "comment_count" INTEGER DEFAULT 0,
    "comment_rate" REAL DEFAULT 0,
    CONSTRAINT "reels_urls_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "filepath" TEXT,
    "reason" TEXT,
    "transcription" TEXT,
    "is_video" BOOLEAN NOT NULL DEFAULT false,
    "job_id" TEXT NOT NULL,
    "analuze_raw_text" TEXT,
    CONSTRAINT "stories_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "post_id" TEXT,
    "reels_id" TEXT,
    "text" TEXT NOT NULL,
    "analyse_raw_text" TEXT,
    CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_reels_id_fkey" FOREIGN KEY ("reels_id") REFERENCES "reels_urls" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
