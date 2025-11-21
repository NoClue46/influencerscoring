import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

async function downloadVideo(url, destPath) {
    const headResponse = await fetch(url, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');

    if (contentLength > MAX_FILE_SIZE) {
        return { skipped: true, reason: `File size ${Math.round(contentLength / 1024 / 1024)}MB exceeds 200MB limit` };
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    return { skipped: false };
}

export const downloadReelsJob = new CronJob('*/5 * * * * *', async () => {
    const reel = await prisma.reels.findFirst({
        where: { status: 'pending', videoUrl: { not: null } },
        include: { job: true }
    });

    if (!reel) return;

    console.log(`[downloadReelsJob] Started for reel ${reel.id}`);

    await prisma.reels.update({
        where: { id: reel.id },
        data: { status: 'downloading_video' }
    });

    try {
        const destPath = path.join(process.env.DATA_PATH, reel.job.username, reel.jobId, reel.id, 'input.mp4');
        const result = await downloadVideo(reel.videoUrl, destPath);

        if (result.skipped) {
            console.log(`[downloadReelsJob] Skipped reel ${reel.id}: ${result.reason}`);
            await prisma.reels.update({
                where: { id: reel.id },
                data: { status: 'extracting_frames', reason: result.reason, attempts: 0 }
            });
        } else {
            console.log(`[downloadReelsJob] Completed for reel ${reel.id}`);
            await prisma.reels.update({
                where: { id: reel.id },
                data: {
                    status: 'extracting_frames',
                    filepath: path.join(reel.job.username, reel.jobId, reel.id, 'input.mp4'),
                    attempts: 0
                }
            });
        }
    } catch (error) {
        console.error(`[downloadReelsJob] Failed for reel ${reel.id}:`, error.message);
        if (reel.attempts >= MAX_ATTEMPTS) {
            await prisma.reels.update({
                where: { id: reel.id },
                data: { status: 'failed', reason: error.message }
            });
        } else {
            await prisma.reels.update({
                where: { id: reel.id },
                data: { status: 'pending', attempts: { increment: 1 } }
            });
        }
    }
});
