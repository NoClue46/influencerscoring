import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { extractAudio } from '../ffmpeg/extract-audio.js';
import path from 'path';
import { transcribeAudio } from '../ask-openai.js';
import { withRetry } from '../utils/helpers.js';
import { withJobTransition } from './with-job-transition.js';

export const speechToTextJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'framing_finished',
        startedStatus: 'speech_to_text_started',
        finishedStatus: 'speech_to_text_finished',
        jobName: 'speechToText'
    }, async (job) => {
        const [reels, stories] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id } }),
            prisma.story.findMany({ where: { jobId: job.id, isVideo: true } })
        ]);

        for (const reel of reels) {
            if (!reel.filepath) {
                console.log(`[speechToText] Skipping reel ${reel.id} - not downloaded (${reel.reason || 'no reason'})`);
                await prisma.reels.update({
                    where: { id: reel.id },
                    data: { transcription: '[NOT_DOWNLOADED]' }
                });
                continue;
            }

            try {
                console.log(`[speechToText] Processing reel ${reel.id}`);
                const audioPath = path.join(path.dirname(reel.filepath), "audio.mp3");
                await extractAudio(reel.filepath, audioPath);

                const transcription = await withRetry(() => transcribeAudio(audioPath));
                await prisma.reels.update({
                    where: { id: reel.id },
                    data: { transcription }
                });
            } catch (e) {
                console.error("[speechToText] failed to transcribe audio: ", e);
            }
        }
        console.log(`[speechToText] Transcribed ${reels.length} reels`);

        for (const story of stories) {
            if (!story.filepath) {
                console.log(`[speechToText] Skipping story ${story.id} - not downloaded (${story.reason || 'no reason'})`);
                await prisma.story.update({
                    where: { id: story.id },
                    data: { transcription: '[NOT_DOWNLOADED]' }
                });
                continue;
            }

            try {
                console.log(`[speechToText] Processing story ${story.id}`);
                const audioPath = path.join(path.dirname(story.filepath), "audio.mp3");
                await extractAudio(story.filepath, audioPath);

                const transcription = await withRetry(() => transcribeAudio(audioPath));
                await prisma.story.update({
                    where: { id: story.id },
                    data: { transcription }
                });
            } catch (e) {
                console.error("[speechToText] failed to transcribe audio: ", e);
            }
        }
        console.log(`[speechToText] Transcribed ${stories.length} stories`);
    })
);
