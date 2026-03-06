import { redflagCheckJob } from '@/pipeline/stages/redflag-check.job.js';
import { fetchJob } from '@/pipeline/stages/fetch.job.js';
import { downloadJob } from '@/pipeline/stages/download.job.js';
import { framingJob } from '@/pipeline/stages/framing.job.js';
import { speechToTextJob } from '@/pipeline/stages/speech-to-text.job.js';
import { analyzeJob } from '@/pipeline/stages/analyze.job.js';
import { cleanupJob } from '@/pipeline/stages/cleanup.job.js';
import { storiesEnrichmentJob } from '@/pipeline/stages/stories-enrichment.job.js';
import { recoverStuckJobs } from '@/pipeline/recover-stuck-jobs.js';

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
    // TODO: temporarily disabled
    // cleanupJob.start()
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
