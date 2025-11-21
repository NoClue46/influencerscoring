import { fetchReelsJob } from './fetchReels.js';
import { downloadReelsJob } from './downloadReels.js';

export function startCronJobs() {
    fetchReelsJob.start();
    downloadReelsJob.start();
    console.log('Cron jobs started');
}

export function stopCronJobs() {
    fetchReelsJob.stop();
    downloadReelsJob.stop();
}
