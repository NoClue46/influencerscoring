import { db } from '@/infra/db/index.js';
import { jobs } from '@/infra/db/schema.js';
import type { Job } from '@/infra/db/types.js';
import { eq, sql } from 'drizzle-orm';
import { MAX_ATTEMPTS } from '@/shared/config/limits.js';
import { JOB_STATUS, type JobStatus } from '@/shared/types/job-status.js';

interface JobTransition {
    fromStatus: JobStatus;
    startedStatus: JobStatus;
    finishedStatus: JobStatus;
    jobName: string;
}

export async function withJobTransition(
    transition: JobTransition,
    handler: (job: Job) => Promise<void>
): Promise<void> {
    const job = await db.query.jobs.findFirst({
        where: eq(jobs.status, transition.fromStatus)
    });
    if (!job) return;

    console.log(`[${transition.jobName}] Started for job ${JSON.stringify(job)}`);

    try {
        await db.update(jobs).set({ status: transition.startedStatus }).where(eq(jobs.id, job.id));

        await handler(job);

        // If handler already changed status (early complete), skip finishedStatus
        const current = await db.query.jobs.findFirst({ where: eq(jobs.id, job.id) });
        if (current && current.status === transition.startedStatus) {
            await db.update(jobs).set({ status: transition.finishedStatus }).where(eq(jobs.id, job.id));
        }

        console.log(`[${transition.jobName}] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[${transition.jobName}] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await db.update(jobs).set({ status: JOB_STATUS.FAILED, reason: err.message }).where(eq(jobs.id, job.id));
        } else {
            await db.update(jobs).set({
                status: transition.fromStatus,
                reason: err.message,
                attempts: sql`${jobs.attempts} + 1`
            }).where(eq(jobs.id, job.id));
        }
    }
}
