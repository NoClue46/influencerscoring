import { CronJob } from 'cron';
import { prisma } from '../prisma.js';

export const processFullAnalyzeJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'full-analyze' }
    });

    if (!job) return;

    const reelsWithAnalysis = await prisma.reels.findMany({
        where: {
            jobId: job.id,
            analyzeRawText: { not: null }
        }
    });

    console.log(`Job ${job.id}: found ${reelsWithAnalysis.length} reels with analyzeRawText`);
});
