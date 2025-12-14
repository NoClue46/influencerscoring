import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const framingJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'downloading_finished' }
    });
    if (!job) return;

    console.log(`[framing] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'framing_started' }
        });

        const [reels, stories] = await Promise.all([
            prisma.reels.findMany({
                where: {
                    jobId: job.id,
                    filepath: { not: null }
                }
            }),
            prisma.story.findMany({
                where: {
                    jobId: job.id,
                    isVideo: true,
                    filepath: { not: null }
                }
            })
        ])

        if (reels.length > 0) {
            for (const reel of reels) {
                const framesDir = path.join(path.dirname(reel.filepath!), 'frames');
                await extractFrames(reel.filepath!, framesDir);
            }
            console.log(`[framing] Extracted frames for ${reels.length} reels`);
        }

        if (stories.length > 0) {
            for (const story of stories) {
                const framesDir = path.join(path.dirname(story.filepath!), 'frames');
                await extractFrames(story.filepath!, framesDir);
            }
            console.log(`[framing] Extracted frames for ${stories.length} video stories`);
        }

        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'framing_finished' }
        });

        console.log(`[framing] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[framing] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'downloading_finished', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});

const execAsync = promisify(exec);

async function extractFrames(videoPath: string, framesDir: string): Promise<void> {
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const outputPattern = path.join(framesDir, 'frame_%04d.jpg');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "fps=1" "${outputPattern}"`);
}