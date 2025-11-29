import { fetchJob } from './fetch.js';
import { downloadJob } from './download.js';
import { framingJob } from './framing.js';
import { speechToTextJob } from './speech-to-text.js';
import { analyzeJob } from './analyze.js';

export function startCronJobs(): void {
    console.log('Cron jobs started');

    fetchJob.start()
    downloadJob.start()
    framingJob.start()
    speechToTextJob.start()
    analyzeJob.start()
}

export function stopCronJobs(): void {
    fetchJob.stop()
    downloadJob.stop()
    framingJob.stop()
    speechToTextJob.stop()
    analyzeJob.stop()
}
