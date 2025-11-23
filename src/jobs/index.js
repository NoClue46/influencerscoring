import { fetchReelsJob } from './fetchReels.js';
import { downloadReelsJob } from './downloadReels.js';
import { extractFramesJob } from './extractFrames.js';
import { analyzeReelsJob } from './analyzeReels.js';
import { processFullAnalyzeJob } from './processFullAnalyze.js';

export function startCronJobs() {
    fetchReelsJob.start();
    downloadReelsJob.start();
    extractFramesJob.start();
    analyzeReelsJob.start();
    processFullAnalyzeJob.start();
    console.log('Cron jobs started');
}

export function stopCronJobs() {
    fetchReelsJob.stop();
    downloadReelsJob.stop();
    extractFramesJob.stop();
    analyzeReelsJob.stop();
    processFullAnalyzeJob.stop();
}
