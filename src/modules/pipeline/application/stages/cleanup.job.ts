import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { jobs } from '@/infra/db/schema.js';
import { inArray } from 'drizzle-orm';
import fs from 'fs';
import { getJobBasePath } from '@/infra/storage/files/paths.js';

export const cleanupJob = new CronJob('0 */10 * * * *', async () => {
    const completedJobs = await db.select().from(jobs).where(
        inArray(jobs.status, ['completed', 'failed'])
    );

    if (completedJobs.length === 0) return;

    console.info(`[cleanup] Found ${completedJobs.length} jobs to clean up`);

    for (const job of completedJobs) {
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
