import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_FILE_SIZE } from '../constants.js';
import { getItemPath } from '../utils/paths.js';
import { withRetry, chunk } from '../utils/helpers.js';
import { withJobTransition } from './with-job-transition.js';
import { downloadFile } from '../utils/download-file.js';
import { downloadAvatar } from '../utils/avatar.js';

export const downloadJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'fetching_finished',
        startedStatus: 'downloading_started',
        finishedStatus: 'downloading_finished',
        jobName: 'download'
    }, async (job) => {
        const [reels, posts, stories] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id } }),
            prisma.post.findMany({ where: { jobId: job.id } }),
            prisma.story.findMany({ where: { jobId: job.id } })
        ])

        const pendingReels = reels.filter(r => !r.filepath);
        for (const batch of chunk(pendingReels, 2)) {
            await Promise.all(batch.map(async (reel) => {
                if (!reel.downloadUrl) {
                    console.warn(`[download] Download url not found for reels: ${reel.id}`)
                    return;
                }

                const dest = getItemPath(job.username, job.id, reel.id, "reels.mp4")

                try {
                    const downloadResult = await withRetry(() => downloadFile(reel.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await prisma.reels.update({
                        where: { id: reel.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    });
                } catch (error) {
                    console.error(`[download] Failed to download reels ${reel.id}: `, error);
                    await prisma.reels.update({
                        where: { id: reel.id },
                        data: { reason: "Failed to download" }
                    });
                }
            }));
        }

        const pendingPosts = posts.filter(p => !p.filepath);
        for (const batch of chunk(pendingPosts, 2)) {
            await Promise.all(batch.map(async (post) => {
                if (!post.downloadUrl) {
                    console.warn(`[download] Download url not found for post: ${post.id}`)
                    return;
                }

                const dest = getItemPath(job.username, job.id, post.id, "post.jpg")

                try {
                    const downloadResult = await withRetry(() => downloadFile(post.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await prisma.post.update({
                        where: { id: post.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    });
                } catch (error) {
                    console.error(`[download] Failed to download post ${post.id}: `, error);
                    await prisma.post.update({
                        where: { id: post.id },
                        data: { reason: "Failed to download" }
                    });
                }
            }));
        }

        const pendingStories = stories.filter(s => !s.filepath);
        for (const batch of chunk(pendingStories, 2)) {
            await Promise.all(batch.map(async (story) => {
                if (!story.downloadUrl) {
                    console.warn(`[download] Download url not found for story: ${story.id}`)
                    return;
                }

                const extension = story.isVideo ? "mp4" : "jpg"
                const dest = getItemPath(job.username, job.id, story.id, `story.${extension}`)

                try {
                    const downloadResult = await withRetry(() => downloadFile(story.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                    await prisma.story.update({
                        where: { id: story.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    });
                } catch (error) {
                    console.error(`[download] Failed to download story ${story.id}: `, error);
                    await prisma.story.update({
                        where: { id: story.id },
                        data: { reason: "Failed to download" }
                    });
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

