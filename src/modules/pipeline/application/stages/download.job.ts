import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { reelsUrls, posts, stories } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { MAX_FILE_SIZE } from '@/shared/config/limits.js';
import { getItemPath } from '@/infra/storage/files/paths.js';
import { withRetry, chunk } from '@/shared/utils/async.js';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { downloadFile } from '@/infra/storage/files/download-file.js';
import { downloadAvatar } from '@/infra/storage/files/avatar.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

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

        const pendingReels = reels.filter(r => !r.filepath);
        for (const batch of chunk(pendingReels, 2)) {
            await Promise.all(batch.map(async (reel) => {
                if (!reel.downloadUrl) {
                    console.warn(`[download] Download url not found for reels: ${reel.id}`);
                    return;
                }

                const dest = getItemPath(job.username, job.id, reel.id, "reels.mp4");

                try {
                    const downloadResult = await withRetry(() => downloadFile(reel.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await db.update(reelsUrls).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(reelsUrls.id, reel.id));
                } catch (error) {
                    console.error(`[download] Failed to download reels ${reel.id}: `, error);
                    await db.update(reelsUrls).set({ reason: "Failed to download" }).where(eq(reelsUrls.id, reel.id));
                }
            }));
        }

        const pendingPosts = allPosts.filter(p => !p.filepath);
        for (const batch of chunk(pendingPosts, 2)) {
            await Promise.all(batch.map(async (post) => {
                if (!post.downloadUrl) {
                    console.warn(`[download] Download url not found for post: ${post.id}`);
                    return;
                }

                const dest = getItemPath(job.username, job.id, post.id, "post.jpg");

                try {
                    const downloadResult = await withRetry(() => downloadFile(post.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await db.update(posts).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(posts.id, post.id));
                } catch (error) {
                    console.error(`[download] Failed to download post ${post.id}: `, error);
                    await db.update(posts).set({ reason: "Failed to download" }).where(eq(posts.id, post.id));
                }
            }));
        }

        const pendingStories = allStories.filter(s => !s.filepath);
        for (const batch of chunk(pendingStories, 2)) {
            await Promise.all(batch.map(async (story) => {
                if (!story.downloadUrl) {
                    console.warn(`[download] Download url not found for story: ${story.id}`);
                    return;
                }

                const extension = story.isVideo ? "mp4" : "jpg";
                const dest = getItemPath(job.username, job.id, story.id, `story.${extension}`);

                try {
                    const downloadResult = await withRetry(() => downloadFile(story.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await db.update(stories).set(
                        downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    ).where(eq(stories.id, story.id));
                } catch (error) {
                    console.error(`[download] Failed to download story ${story.id}: `, error);
                    await db.update(stories).set({ reason: "Failed to download" }).where(eq(stories.id, story.id));
                }
            }));
        }

        // Download avatar
        if (job.avatarUrl) {
            try {
                await withRetry(() => downloadAvatar(job.avatarUrl!, job.username, job.id), 3);
            } catch (error) {
                console.warn(`[download] Failed to download avatar for ${job.username}:`, error);
            }
        }
    })
);
