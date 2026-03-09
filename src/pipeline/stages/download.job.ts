import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { reelsUrls, posts, stories } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { MAX_FILE_SIZE } from '@/shared/limits.js';
import { getItemPath } from '@/storage/paths.js';
import { withRetry, chunk } from '@/shared/async.js';
import { withJobTransition } from '@/pipeline/with-job-transition.js';
import { downloadFile } from '@/storage/download-file.js';
import { downloadAvatar } from '@/storage/avatar.js';
import { getAvatarPath } from '@/storage/paths.js';
import { JOB_STATUS } from '@/shared/job-status.js';
import fs from 'fs';

export const downloadJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.FETCHING_FINISHED,
        startedStatus: JOB_STATUS.DOWNLOADING_STARTED,
        finishedStatus: JOB_STATUS.DOWNLOADING_FINISHED,
        jobName: 'download'
    }, async (job) => {
        const [reels, allPosts, allStories] = await Promise.all([
            db.select().from(reelsUrls).where(eq(reelsUrls.jobId, job.id)),
            db.select().from(posts).where(eq(posts.jobId, job.id)),
            db.select().from(stories).where(eq(stories.jobId, job.id))
        ]);

        const stats = { downloaded: 0, skipped: 0, failed: 0 };

        const pendingReels = reels.filter(r => !r.filepath);
        for (const batch of chunk(pendingReels, 2)) {
            await Promise.all(batch.map(async (reel) => {
                if (!reel.downloadUrl) {
                    console.warn(`[download] Download url not found for reels: ${reel.id}`);
                    stats.skipped++;
                    return;
                }

                const dest = getItemPath(job.username, job.id, reel.id, "reels.mp4");

                try {
                    const downloadResult = await withRetry(() => downloadFile(reel.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3, `reel ${reel.id}`);
                    await db.update(reelsUrls).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(reelsUrls.id, reel.id));
                    downloadResult.skipped ? stats.skipped++ : stats.downloaded++;
                } catch (error) {
                    console.error(`[download] Gave up on reel ${reel.id}`);
                    await db.update(reelsUrls).set({ reason: "Failed to download" }).where(eq(reelsUrls.id, reel.id));
                    stats.failed++;
                }
            }));
        }

        const pendingPosts = allPosts.filter(p => !p.filepath);
        for (const batch of chunk(pendingPosts, 2)) {
            await Promise.all(batch.map(async (post) => {
                if (!post.downloadUrl) {
                    console.warn(`[download] Download url not found for post: ${post.id}`);
                    stats.skipped++;
                    return;
                }

                const dest = getItemPath(job.username, job.id, post.id, "post.jpg");

                try {
                    const downloadResult = await withRetry(() => downloadFile(post.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3, `post ${post.id}`);
                    await db.update(posts).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(posts.id, post.id));
                    downloadResult.skipped ? stats.skipped++ : stats.downloaded++;
                } catch (error) {
                    console.error(`[download] Gave up on post ${post.id}`);
                    await db.update(posts).set({ reason: "Failed to download" }).where(eq(posts.id, post.id));
                    stats.failed++;
                }
            }));
        }

        const pendingStories = allStories.filter(s => !s.filepath);
        for (const batch of chunk(pendingStories, 2)) {
            await Promise.all(batch.map(async (story) => {
                if (!story.downloadUrl) {
                    console.warn(`[download] Download url not found for story: ${story.id}`);
                    stats.skipped++;
                    return;
                }

                const extension = story.isVideo ? "mp4" : "jpg";
                const dest = getItemPath(job.username, job.id, story.id, `story.${extension}`);

                try {
                    const downloadResult = await withRetry(() => downloadFile(story.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3, `story ${story.id}`);
                    await db.update(stories).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(stories.id, story.id));
                    downloadResult.skipped ? stats.skipped++ : stats.downloaded++;
                } catch (error) {
                    console.error(`[download] Gave up on story ${story.id}`);
                    await db.update(stories).set({ reason: "Failed to download" }).where(eq(stories.id, story.id));
                    stats.failed++;
                }
            }));
        }

        // Download avatar (skip if already downloaded in redflag-check)
        const avatarPath = getAvatarPath(job.username, job.id);
        if (job.avatarUrl && !fs.existsSync(avatarPath)) {
            try {
                await withRetry(() => downloadAvatar(job.avatarUrl!, job.username, job.id), 3, `avatar @${job.username}`);
                stats.downloaded++;
            } catch (error) {
                console.warn(`[download] Gave up on avatar @${job.username}`);
                stats.failed++;
            }
        }

        console.log(`[download] @${job.username}: ${stats.downloaded} ok, ${stats.skipped} skipped, ${stats.failed} failed`);
    })
);
