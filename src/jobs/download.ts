import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS, MAX_FILE_SIZE } from '../constants.js';
import fs from 'fs';
import path from 'path';
import { getItemPath } from '../utils/paths.js';

export const downloadJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'fetching_finished' }
    });

    if (!job) return;

    console.info(`[download] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'downloading_started' }
        });

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

            for (let it = 0; it < 5; it++) {
                try {
                    const downloadResult = await download(reel.downloadUrl, dest);

                    await prisma.reels.update({
                        where: { id: reel.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    })

                    break;
                } catch (error) {
                    console.error(`[download] Failed to download reels ${reel.id}: `, error);
                    if (it === 4) {
                        await prisma.reels.update({
                            where: { id: reel.id },
                            data: { reason: "Failed to download" }
                        })
                    }
                }
            }
        }

        for (const post of posts) {
            if (!post.downloadUrl) {
                console.warn(`[download] Download url not found for post: ${post.id}`)
                continue;
            }

            const dest = getItemPath(job.username, job.id, post.id, "post.jpg")

            for (let it = 0; it < 5; it++) {
                try {
                    const downloadResult = await download(post.downloadUrl, dest);

                    await prisma.post.update({
                        where: { id: post.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    })

                    break;
                } catch (error) {
                    console.error(`[download] Failed to download post ${post.id}: `, error);
                    if (it === 4) {
                        await prisma.post.update({
                            where: { id: post.id },
                            data: { reason: "Failed to download" }
                        })
                    }
                }
            }
        }

        for (const story of stories) {
            if (!story.downloadUrl) {
                console.warn(`[download] Download url not found for story: ${story.id}`)
                continue;
            }

            const extension = story.isVideo ? "mp4" : "jpg"
            const dest = getItemPath(job.username, job.id, story.id, `story.${extension}`)

            for (let it = 0; it < 5; it++) {
                try {
                    const downloadResult = await download(story.downloadUrl, dest);

                    await prisma.story.update({
                        where: { id: story.id },
                        data: downloadResult.skipped ? { reason: downloadResult.reason } : { filepath: dest }
                    })

                    break;
                } catch (error) {
                    console.error(`[download] Failed to download story ${story.id}: `, error);
                    if (it === 4) {
                        await prisma.story.update({
                            where: { id: story.id },
                            data: { reason: "Failed to download" }
                        })
                    }
                }
            }
        }

        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'downloading_finished' }
        });

        console.log(`[download] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[download] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'fetching_finished', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});

interface DownloadResult {
    skipped: boolean;
    reason?: string;
}

async function download(url: string, destPath: string): Promise<DownloadResult> {
    const headResponse = await fetch(url, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') ?? '0');

    if (contentLength > MAX_FILE_SIZE) {
        return { skipped: true, reason: `File size ${Math.round(contentLength / 1024 / 1024)}MB exceeds 200MB limit` };
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    return { skipped: false };
}