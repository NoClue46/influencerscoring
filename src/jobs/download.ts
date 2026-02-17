import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_FILE_SIZE } from '../constants.js';
import { getItemPath } from '../utils/paths.js';
import { withRetry } from '../utils/helpers.js';
import { withJobTransition } from './with-job-transition.js';
import { downloadFile } from '../utils/download-file.js';

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

        for (const reel of reels) {
            if (!reel.downloadUrl) {
                console.warn(`[download] Download url not found for reels: ${reel.id}`)
                continue;
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
        }

        for (const post of posts) {
            if (!post.downloadUrl) {
                console.warn(`[download] Download url not found for post: ${post.id}`)
                continue;
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
        }

        for (const story of stories) {
            if (!story.downloadUrl) {
                console.warn(`[download] Download url not found for story: ${story.id}`)
                continue;
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
        }
    })
);

