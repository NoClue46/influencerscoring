import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function extractFrames(videoPath: string, framesDir: string): Promise<void> {
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const outputPattern = path.join(framesDir, 'frame_%04d.jpg');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "fps=1" "${outputPattern}"`);
}

export const extractFramesJob = new CronJob('*/5 * * * * *', async () => {

    const job = await prisma.job.findFirst({
        where: { status: "extracting_frames" }
    });

    if (!job) return;

    const reels = await prisma.reels.findFirst({
        where: { status: 'extracting_frames', jobId: job.id },
    });

    if (!reels) return;

    console.log(`[extractFramesJob] Started for reels: ${JSON.stringify(reels)}`);

    try {
        const dataPath = process.env.DATA_PATH ?? './data';
        const videoPath = path.join(dataPath, reels.filepath ?? '');
        const framesDir = path.join(path.dirname(videoPath), 'frames');

        await extractFrames(videoPath, framesDir);

        console.log(`[extractFramesJob] Completed for reel ${reels.id}`);
        await prisma.reels.update({
            where: { id: reels.id },
            data: { status: 'analysing', attempts: 0 }
        });
    } catch (error) {
        const err = error as Error;
        console.error(`[extractFramesJob] Failed for reel ${reels.id}:`, err.message);
        if (reels.attempts >= MAX_ATTEMPTS) {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { attempts: { increment: 1 } }
            });
        }
    }

    // Check if all reels are done processing
    const remainingReels = await prisma.reels.count({
        where: {
            jobId: job.id,
            status: { notIn: ['failed', 'analysing', 'completed'] }
        }
    });

    if (remainingReels === 0) {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'analyzing' }
        });
        console.log(`[extractFramesJob] All reels processed, job ${job.id} status updated to analyzing`);
    }
});
