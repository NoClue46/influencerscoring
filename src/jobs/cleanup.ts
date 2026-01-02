import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import fs from 'fs';
import { getJobBasePath } from '../utils/paths.js';

export const cleanupJob = new CronJob('0 */10 * * * *', async () => {
    const jobs = await prisma.job.findMany({
        where: { status: { in: ['completed', 'failed'] } }
    });

    if (jobs.length === 0) return;

    console.info(`[cleanup] Found ${jobs.length} jobs to clean up`);

    for (const job of jobs) {
        const jobDir = getJobBasePath(job.username, job.id);

        try {
            if (fs.existsSync(jobDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
                console.log(`[cleanup] Deleted ${jobDir}`);
            }
        } catch (error) {
            console.error(`[cleanup] Failed to delete ${jobDir}:`, error);
        }
    }
});
