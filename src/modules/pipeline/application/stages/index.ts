import { redflagCheckJob } from '@/modules/pipeline/application/stages/redflag-check.job.js';
import { fetchJob } from '@/modules/pipeline/application/stages/fetch.job.js';
import { downloadJob } from '@/modules/pipeline/application/stages/download.job.js';
import { framingJob } from '@/modules/pipeline/application/stages/framing.job.js';
import { speechToTextJob } from '@/modules/pipeline/application/stages/speech-to-text.job.js';
import { analyzeJob } from '@/modules/pipeline/application/stages/analyze.job.js';
import { cleanupJob } from '@/modules/pipeline/application/stages/cleanup.job.js';
import { storiesEnrichmentJob } from '@/modules/pipeline/application/stages/stories-enrichment.job.js';
import { recoverStuckJobs } from '@/modules/pipeline/application/orchestrator/recover-stuck-jobs.js';

export async function startCronJobs(): Promise<void> {
    console.log('Recovering stuck jobs...');
    await recoverStuckJobs();

    console.log('Cron jobs started');

    redflagCheckJob.start()
    fetchJob.start()
    downloadJob.start()
    framingJob.start()
    speechToTextJob.start()
    analyzeJob.start()
    cleanupJob.start()
    storiesEnrichmentJob.start()
}

export function stopCronJobs(): void {
    redflagCheckJob.stop()
    fetchJob.stop()
    downloadJob.stop()
    framingJob.stop()
    speechToTextJob.stop()
    analyzeJob.stop()
    cleanupJob.stop()
    storiesEnrichmentJob.stop()
}
