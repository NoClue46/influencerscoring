import { prisma } from '../prisma.js';

export async function recoverStuckJobs(): Promise<void> {
    const statusMappings = [
        { stuckStatus: 'redflag_checking_started', recoverStatus: 'pending' },
        { stuckStatus: 'fetching_started', recoverStatus: 'redflag_checking_finished' },
        { stuckStatus: 'downloading_started', recoverStatus: 'fetching_finished' },
        { stuckStatus: 'framing_started', recoverStatus: 'downloading_finished' },
        { stuckStatus: 'speech_to_text_started', recoverStatus: 'framing_finished' },
        { stuckStatus: 'analyzing_started', recoverStatus: 'speech_to_text_finished' }
    ];

    for (const mapping of statusMappings) {
        const result = await prisma.job.updateMany({
            where: { status: mapping.stuckStatus },
            data: { status: mapping.recoverStatus }
        });

        if (result.count > 0) {
            console.log(`[recovery] Recovered ${result.count} jobs: "${mapping.stuckStatus}" → "${mapping.recoverStatus}"`);
        }
    }
}
