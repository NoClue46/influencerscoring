import { fetchReelsJob } from './fetchReels.js';
import { downloadReelsJob } from './downloadReels.js';
import { checkDownloadingCompleteJob } from './checkDownloadingComplete.js';
import { extractFramesJob } from './extractFrames.js';
import { analyzeReelsJob } from './analyzeReels.js';

export function startCronJobs() {
    fetchReelsJob.start();
    downloadReelsJob.start();
    checkDownloadingCompleteJob.start();
    extractFramesJob.start();
    analyzeReelsJob.start();
    console.log('Cron jobs started');
}

export function stopCronJobs() {
    fetchReelsJob.stop();
    downloadReelsJob.stop();
    checkDownloadingCompleteJob.stop();
    extractFramesJob.stop();
    analyzeReelsJob.stop();
}
