import { redflagCheckJob } from './redflag-check.js';
import { fetchJob } from './fetch.js';
import { downloadJob } from './download.js';
import { framingJob } from './framing.js';
import { speechToTextJob } from './speech-to-text.js';
import { analyzeJob } from './analyze.js';
import { cleanupJob } from './cleanup.js';
import { recoverStuckJobs } from './recovery.js';

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
    // cleanupJob.start()
}

export function stopCronJobs(): void {
    redflagCheckJob.stop()
    fetchJob.stop()
    downloadJob.stop()
    framingJob.stop()
    speechToTextJob.stop()
    analyzeJob.stop()
    // cleanupJob.stop()
}
