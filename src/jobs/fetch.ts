import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { fetchPosts, fetchReels } from '../scrape-creators.js';

export const fetchJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'pending' }
    });

    if (!job) return;

    console.log(`[fetch] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'fetching_started' }
        });

        const [reels, posts] = await Promise.all([
            fetchReels(job.username, job.postNumber),
            fetchPosts(job.username, job.postNumber)
        ])

        await Promise.all([
            prisma.post.createMany({
                data: [
                    ...posts.map((p) => ({
                        jobId: job.id,
                        postUrl: p.url,
                        downloadUrl: p.downloadUrl,
                        isVideo: p.isVideo
                    }))
                ]
            }),
            prisma.reels.createMany({
                data: [
                    ...reels.map((r) => ({
                        jobId: job.id,
                        reelsUrl: r.url,
                        downloadUrl: r.downloadUrl
                    }))
                ]
            })
        ])

        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'fetching_finished' }
        });

        console.log(`[fetch] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[fetch] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'pending', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});
