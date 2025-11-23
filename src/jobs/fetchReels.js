import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { fetchAllReels, fetchReelsUrl } from '../scrape-creators.js';

export const fetchReelsJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'pending' }
    });

    if (!job) return;

    console.log(`[fetchReelsJob] Started for job ${JSON.stringify(job)}`);

    try {

        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'fetching_reels',
                startedAt: new Date()
            }
        });
        
        const reelUrls = await fetchAllReels(job.username, job.postNumber || 10);

        for (const reelUrl of reelUrls) {
            let videoUrl = null;
            try {
                videoUrl = await fetchReelsUrl(reelUrl);
                await prisma.reels.create({
                    data: {
                        url: reelUrl,
                        videoUrl: videoUrl,
                        jobId: job.id,
                        status: 'pending'
                    }
                });
            } catch (e) {
                console.error(`Failed to fetch video URL for ${reelUrl}:`, e.message);
                await prisma.reels.create({
                    data: {
                        url: reelUrl,
                        videoUrl: null,
                        jobId: job.id,
                        status: 'failed',
                        reason: e.message || "Failed to fetch reels url"
                    }
                });
            }

        }

        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'downloading_videos'
            }
        });

        console.log(`[fetchReelsJob] Completed for job ${job.id}, found ${reelUrls.length} reels`);

    } catch (error) {
        console.error(`[fetchReelsJob] Failed for job ${job.id}:`, error.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: error.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'pending', reason: error.message, attempts: { increment: 1 } }
            });
        }
    }
});
