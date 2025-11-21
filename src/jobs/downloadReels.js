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
        const destPath = path.join(process.env.DATA_PATH, reel.job.username, `${reel.id}.mp4`);
        const result = await downloadVideo(reel.videoUrl, destPath);

        if (result.skipped) {
            console.log(`[downloadReelsJob] Skipped reel ${reel.id}: ${result.reason}`);
            await prisma.reels.update({
                where: { id: reel.id },
                data: { status: 'completed', reason: result.reason }
            });
        } else {
            console.log(`[downloadReelsJob] Completed for reel ${reel.id}`);
            await prisma.reels.update({
                where: { id: reel.id },
                data: {
                    status: 'completed',
                    filepath: path.join(reel.job.username, `${reel.id}.mp4`)
                }
            });
        }

        // Check if all reels completed
        const pendingCount = await prisma.reels.count({
            where: { jobId: reel.jobId, status: { not: 'completed' } }
        });

        if (pendingCount === 0) {
            console.log(`[downloadReelsJob] All reels completed for job ${reel.jobId}`);
            await prisma.job.update({
                where: { id: reel.jobId },
                data: { status: 'extracting_frames' }
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
