import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { askOpenai } from '../ask-openai.js';
import fs from 'fs';
import path from 'path';

export const analyzeReelsJob = new CronJob('*/5 * * * * *', async () => {

    const job = await prisma.job.findFirst({
        where: { status: "analyzing" }
    })

    if (!job) return;

    const reels = await prisma.reels.findFirst({
        where: { status: 'analysing' },
    });

    if (!reels) return;

    console.log(`[analyzeReelsJob] Started for reels: ${JSON.stringify(reels)}`);

    try {
        const videoPath = path.join(process.env.DATA_PATH, reels.filepath);
        const framesDir = path.join(path.dirname(videoPath), 'frames');

        const allFrames = fs.readdirSync(framesDir)
            .filter(f => f.endsWith('.jpg'))
            .sort()
            .map(f => path.join(framesDir, f));

        const selectedFrames = selectFrames(allFrames, 10);

        const result = await askOpenai(selectedFrames, job.postPrompt);

        console.log(`[analyzeReelsJob] Completed for reel ${reels.id}`);
        await prisma.reels.update({
            where: { id: reels.id },
            data: { status: 'completed', attempts: 0, analyzeRawText: result.text }
        });
    } catch (error) {
        console.error(`[analyzeReelsJob] Failed for reel ${reels.id}:`, error.message);
        if (reels.attempts >= MAX_ATTEMPTS) {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { status: 'failed', reason: error.message }
            });
        } else {
            await prisma.reels.update({
                where: { id: reels.id },
                data: { attempts: { increment: 1 } }
            });
        }
    }

    // Check if all reels are done (completed or failed)
    const remainingReels = await prisma.reels.count({
        where: {
            jobId: job.id,
            status: { notIn: ['failed', 'completed'] }
        }
    });

    if (remainingReels === 0) {
        if (job.allVideos) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: "full-analyze" }
            })
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'completed' }
            });
            console.log(`[analyzeReelsJob] All reels processed, job ${job.id} completed`);
        }
    }
});


function selectFrames(frames, count = 10) {
    if (frames.length <= count) return frames;

    const step = frames.length / count;
    const selected = [];
    for (let i = 0; i < count; i++) {
        selected.push(frames[Math.floor(i * step)]);
    }
    return selected;
}