import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { reelsUrls, stories } from '@/infra/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { extractAudio } from '@/modules/media/infra/ffmpeg/extract-audio.js';
import path from 'path';
import { transcribeAudio } from '@/modules/ai/infra/openai-gateway.js';
import { withRetry } from '@/shared/utils/async.js';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

export const speechToTextJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.FRAMING_FINISHED,
        startedStatus: JOB_STATUS.SPEECH_TO_TEXT_STARTED,
        finishedStatus: JOB_STATUS.SPEECH_TO_TEXT_FINISHED,
        jobName: 'speechToText'
    }, async (job) => {
        const [reels, videoStories] = await Promise.all([
            db.select().from(reelsUrls).where(eq(reelsUrls.jobId, job.id)),
            db.select().from(stories).where(and(eq(stories.jobId, job.id), eq(stories.isVideo, true)))
        ]);

        for (const reel of reels) {
            if (!reel.filepath) {
                console.log(`[speechToText] Skipping reel ${reel.id} - not downloaded (${reel.reason || 'no reason'})`);
                await db.update(reelsUrls).set({ transcription: '[NOT_DOWNLOADED]' }).where(eq(reelsUrls.id, reel.id));
                continue;
            }
            if (reel.transcription) {
                continue;
            }

            try {
                console.log(`[speechToText] Processing reel ${reel.id}`);
                const audioPath = path.join(path.dirname(reel.filepath), "audio.mp3");
                await extractAudio(reel.filepath, audioPath);

                const transcription = await withRetry(() => transcribeAudio(audioPath));
                await db.update(reelsUrls).set({ transcription }).where(eq(reelsUrls.id, reel.id));
            } catch (e) {
                console.error("[speechToText] failed to transcribe audio: ", e);
            }
        }
        console.log(`[speechToText] Transcribed ${reels.length} reels`);

        for (const story of videoStories) {
            if (!story.filepath) {
                console.log(`[speechToText] Skipping story ${story.id} - not downloaded (${story.reason || 'no reason'})`);
                await db.update(stories).set({ transcription: '[NOT_DOWNLOADED]' }).where(eq(stories.id, story.id));
                continue;
            }
            if (story.transcription) {
                continue;
            }

            try {
                console.log(`[speechToText] Processing story ${story.id}`);
                const audioPath = path.join(path.dirname(story.filepath), "audio.mp3");
                await extractAudio(story.filepath, audioPath);

                const transcription = await withRetry(() => transcribeAudio(audioPath));
                await db.update(stories).set({ transcription }).where(eq(stories.id, story.id));
            } catch (e) {
                console.error("[speechToText] failed to transcribe audio: ", e);
            }
        }
        console.log(`[speechToText] Transcribed ${videoStories.length} stories`);
    })
);
