import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { Job } from '@prisma/client';

interface JobTransition {
    fromStatus: string;
    startedStatus: string;
    finishedStatus: string;
    jobName: string;
}

export async function withJobTransition(
    transition: JobTransition,
    handler: (job: Job) => Promise<void>
): Promise<void> {
    const job = await prisma.job.findFirst({
        where: { status: transition.fromStatus }
    });
    if (!job) return;

    console.log(`[${transition.jobName}] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: transition.startedStatus }
        });

        await handler(job);

        // If handler already changed status (early complete), skip finishedStatus
        const current = await prisma.job.findUnique({ where: { id: job.id } });
        if (current && current.status === transition.startedStatus) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: transition.finishedStatus }
            });
        }

        console.log(`[${transition.jobName}] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[${transition.jobName}] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: transition.fromStatus, reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
}
