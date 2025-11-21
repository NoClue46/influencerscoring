import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function extractFrames(videoPath, framesDir) {
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const outputPattern = path.join(framesDir, 'frame_%04d.jpg');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "fps=1" "${outputPattern}"`);
}

export const extractFramesJob = new CronJob('*/5 * * * * *', async () => {
    const reel = await prisma.reels.findFirst({
        where: { status: 'extracting_frames', filepath: { not: null } },
        include: { job: true }
    });

    if (!reel) return;

    console.log(`[extractFramesJob] Started for reel ${reel.id}`);

    try {
        const videoPath = path.join(process.env.DATA_PATH, reel.filepath);
        const framesDir = path.join(path.dirname(videoPath), 'frames');

        await extractFrames(videoPath, framesDir);

        console.log(`[extractFramesJob] Completed for reel ${reel.id}`);
        await prisma.reels.update({
            where: { id: reel.id },
            data: { status: 'analysing', attempts: 0 }
        });
    } catch (error) {
        console.error(`[extractFramesJob] Failed for reel ${reel.id}:`, error.message);
        if (reel.attempts >= MAX_ATTEMPTS) {
            await prisma.reels.update({
                where: { id: reel.id },
                data: { status: 'failed', reason: error.message }
            });
        } else {
            await prisma.reels.update({
                where: { id: reel.id },
                data: { attempts: { increment: 1 } }
            });
        }
    }
});
