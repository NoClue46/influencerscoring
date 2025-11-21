import { CronJob } from 'cron';
import { prisma } from '../prisma.js';

export const checkDownloadingCompleteJob = new CronJob('*/2 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'downloading_videos' },
        include: { reels: true }
    });

    if (!job) return;

    const allReelsReady = job.reels.every(
        reel => reel.status === 'extracting_frames' || reel.status === 'failed'
    );

    if (allReelsReady) {
        console.log(`[checkDownloadingComplete] Job ${job.id} all reels ready, moving to extracting_frames`);
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'extracting_frames' }
        });
    }
});
