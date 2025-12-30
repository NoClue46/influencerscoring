import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import { transcribeAudio } from '../ask-openai.js';
import { sleep } from '../utils/helpers.js';

export const speechToTextJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'framing_finished' }
    });
    if (!job) return;

    console.log(`[speechToText] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'speech_to_text_started' }
        });

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

        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'speech_to_text_finished' }
        });

        console.log(`[speechToText] Completed for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[speechToText] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'framing_finished', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});

const execAsync = promisify(exec);

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    console.log(`[extractAudio] Starting: ${videoPath} -> ${audioPath}`);
    try {
        await execAsync(`ffmpeg -y -i "${videoPath}" -vn -acodec mp3 "${audioPath}"`);
        console.log(`[extractAudio] Success: ${audioPath}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[extractAudio] Failed: ${err.message}`);
        throw error;
    }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`[speechToText] Attempt ${attempt}/${maxRetries} failed: ${error}`)
            lastError = error as Error;
            if (attempt === maxRetries) throw lastError;
            await sleep(1000);
        }
    }
    throw lastError!;
}
