import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { askOpenai } from '../ask-openai.js';
import fs from 'fs';
import path from 'path';

function selectFrames(frames, count = 10) {
    if (frames.length <= count) return frames;

    const step = frames.length / count;
    const selected = [];
    for (let i = 0; i < count; i++) {
        selected.push(frames[Math.floor(i * step)]);
    }
    return selected;
}

export const analyzeReelsJob = new CronJob('*/5 * * * * *', async () => {
    const reel = await prisma.reels.findFirst({
        where: { status: 'analysing' },
        include: { job: true }
    });

    if (!reel) return;

    console.log(`[analyzeReelsJob] Started for reel ${reel.id}`);

    try {
        const videoPath = path.join(process.env.DATA_PATH, reel.filepath);
        const framesDir = path.join(path.dirname(videoPath), 'frames');

        const allFrames = fs.readdirSync(framesDir)
            .filter(f => f.endsWith('.jpg'))
            .sort()
            .map(f => path.join(framesDir, f));

        const selectedFrames = selectFrames(allFrames, 10);

        const result = await askOpenai(selectedFrames, reel.job.prompt);

        console.log(`[analyzeReelsJob] Completed for reel ${reel.id}`);
        await prisma.reels.update({
            where: { id: reel.id },
            data: { status: 'completed', attempts: 0, analyzeRawText: result.text }
        });
    } catch (error) {
        console.error(`[analyzeReelsJob] Failed for reel ${reel.id}:`, error.message);
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
