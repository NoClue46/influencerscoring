-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_jobs" ("all_videos", "analyse_raw_text", "attempts", "blogger_prompt", "id", "nickname_analyse_raw_text", "post_number", "post_prompt", "reason", "status", "username") SELECT "all_videos", "analyse_raw_text", "attempts", "blogger_prompt", "id", "nickname_analyse_raw_text", "post_number", "post_prompt", "reason", "status", "username" FROM "jobs";
DROP TABLE "jobs";
ALTER TABLE "new_jobs" RENAME TO "jobs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
