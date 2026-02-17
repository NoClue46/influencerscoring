import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { extractFrames } from '../ffmpeg/extract-frames.js';
import path from 'path';
import { withJobTransition } from './with-job-transition.js';

export const framingJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'downloading_finished',
        startedStatus: 'framing_started',
        finishedStatus: 'framing_finished',
        jobName: 'framing'
    }, async (job) => {
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
    })
);
