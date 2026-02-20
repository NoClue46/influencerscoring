import { db } from '@/infra/db/index.js';
import { jobs } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { JOB_STATUS, type JobStatus } from '@/shared/types/job-status.js';

export async function recoverStuckJobs(): Promise<void> {
    const statusMappings: Array<{ stuckStatus: JobStatus; recoverStatus: JobStatus }> = [
        { stuckStatus: JOB_STATUS.REDFLAG_CHECKING_STARTED, recoverStatus: JOB_STATUS.PENDING },
        { stuckStatus: JOB_STATUS.FETCHING_STARTED, recoverStatus: JOB_STATUS.REDFLAG_CHECKING_FINISHED },
        { stuckStatus: JOB_STATUS.DOWNLOADING_STARTED, recoverStatus: JOB_STATUS.FETCHING_FINISHED },
        { stuckStatus: JOB_STATUS.FRAMING_STARTED, recoverStatus: JOB_STATUS.DOWNLOADING_FINISHED },
        { stuckStatus: JOB_STATUS.SPEECH_TO_TEXT_STARTED, recoverStatus: JOB_STATUS.FRAMING_FINISHED },
        { stuckStatus: JOB_STATUS.ANALYZING_STARTED, recoverStatus: JOB_STATUS.SPEECH_TO_TEXT_FINISHED },
    ];

    for (const mapping of statusMappings) {
        const result = await db.update(jobs)
            .set({ status: mapping.recoverStatus })
            .where(eq(jobs.status, mapping.stuckStatus))
            .returning();

        if (result.length > 0) {
            console.log(`[recovery] Recovered ${result.length} jobs: "${mapping.stuckStatus}" → "${mapping.recoverStatus}"`);
        }
    }
}
