import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { reelsUrls, stories } from '@/infra/db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { extractFrames } from '@/modules/media/infra/ffmpeg/extract-frames.js';
import path from 'path';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

export const framingJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.DOWNLOADING_FINISHED,
        startedStatus: JOB_STATUS.FRAMING_STARTED,
        finishedStatus: JOB_STATUS.FRAMING_FINISHED,
        jobName: 'framing'
    }, async (job) => {
        const [reels, videoStories] = await Promise.all([
            db.select().from(reelsUrls).where(
                and(eq(reelsUrls.jobId, job.id), isNotNull(reelsUrls.filepath))
            ),
            db.select().from(stories).where(
                and(eq(stories.jobId, job.id), eq(stories.isVideo, true), isNotNull(stories.filepath))
            )
        ]);

        if (reels.length > 0) {
            for (const reel of reels) {
                const framesDir = path.join(path.dirname(reel.filepath!), 'frames');
                await extractFrames(reel.filepath!, framesDir);
            }
            console.log(`[framing] Extracted frames for ${reels.length} reels`);
        }

        if (videoStories.length > 0) {
            for (const story of videoStories) {
                const framesDir = path.join(path.dirname(story.filepath!), 'frames');
                await extractFrames(story.filepath!, framesDir);
            }
            console.log(`[framing] Extracted frames for ${videoStories.length} video stories`);
        }
    })
);
