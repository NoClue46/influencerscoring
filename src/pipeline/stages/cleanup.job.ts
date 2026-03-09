import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { jobs } from '@/db/schema.js';
import { inArray } from 'drizzle-orm';
import fs from 'fs';
import { getJobBasePath } from '@/storage/paths.js';

export const cleanupJob = new CronJob('0 */10 * * * *', async () => {
    const completedJobs = await db.select().from(jobs).where(
        inArray(jobs.status, ['completed', 'failed'])
    );

    if (completedJobs.length === 0) return;

    let deleted = 0;
    let failed = 0;

    for (const job of completedJobs) {
        const jobDir = getJobBasePath(job.username, job.id);

        try {
            if (fs.existsSync(jobDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
                deleted++;
            }
        } catch (error) {
            console.error(`[cleanup] Failed to delete ${jobDir}:`, error);
            failed++;
        }
    }

    if (deleted > 0 || failed > 0) {
        console.log(`[cleanup] Cleaned ${deleted} jobs (${failed} errors)`);
    }
});
