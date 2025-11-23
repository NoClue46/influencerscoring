import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import fs from 'fs';
import path from 'path';

export const downloadReelsJob = new CronJob('*/5 * * * * *', async () => {

    const job = await prisma.job.findFirst({
        where: { status: "downloading_videos" }
    })

    if (!job) return;

    const reels = await prisma.reels.findFirst({
        where: { status: 'pending', jobId: job.id },
    });

    try {
        if (!reels) {
            return;
        }

        console.log(`[downloadReelsJob] Started for reels ${JSON.stringify(reels)}`);

        await prisma.reels.update({
            where: { id: reels.id },
            data: { status: 'downloading_video' }
        });

        const destPath = path.join(process.env.DATA_PATH, job.username, reels.jobId, reels.id, 'input.mp4');
        const result = await downloadVideo(reels.videoUrl, destPath);

        console.info(`[downloadReelsJob] Download result for ${reels.id}: `, JSON.stringify(result))

        if (result.skipped) {
            console.log(`[downloadReelsJob] Skipped reel ${reels.id}: ${result.reason}`);
            await prisma.reels.update({
                where: { id: reels.id },
                data: { status: 'completed', reason: result.reason }
            });
        } else {
            await prisma.reels.update({
                where: { id: reels.id },
                data: {
                    status: 'extracting_frames',
                    filepath: path.join(job.username, job.id, reels.id, 'input.mp4'),
                    attempts: 0
                }
            });
        }
    } catch (error) {
        console.error(`[downloadReelsJob] Failed for reel ${reels.id}:`, error);
        if (reels.attempts >= MAX_ATTEMPTS) {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { status: 'failed', reason: error.message }
            });
        } else {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { status: 'pending', attempts: { increment: 1 } }
            });
        }
    }

    // Проверить все ли reels обработаны
    const remainingPending = await prisma.reels.count({
        where: {
            jobId: job.id,
            status: 'pending'
        }
    });

    if (remainingPending === 0) {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'extracting_frames' }
        });
        console.log(`[downloadReelsJob] Job ${job.id} -> extracting_frames`);
    }
});

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