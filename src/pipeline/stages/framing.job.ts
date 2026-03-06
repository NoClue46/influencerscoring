import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { reelsUrls, stories } from '@/db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { extractFrames } from '@/media/extract-frames.js';
import path from 'path';
import fs from 'fs';
import { withJobTransition } from '@/pipeline/with-job-transition.js';
import { JOB_STATUS } from '@/shared/job-status.js';

async function extractFramesForItems(items: { id: string; filepath: string | null }[], label: string) {
    let processed = 0;
    for (const item of items) {
        if (!fs.existsSync(item.filepath!)) {
            console.log(`[framing] Skipping ${label} ${item.id} - file not found`);
            continue;
        }
        const framesDir = path.join(path.dirname(item.filepath!), 'frames');
        if (fs.existsSync(framesDir) && fs.readdirSync(framesDir).length > 0) {
            continue;
        }
        await extractFrames(item.filepath!, framesDir);
        processed++;
    }
    console.log(`[framing] Extracted frames for ${processed}/${items.length} ${label}`);
}

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

        if (reels.length > 0) await extractFramesForItems(reels, 'reels');
        if (videoStories.length > 0) await extractFramesForItems(videoStories, 'video stories');
    })
);
