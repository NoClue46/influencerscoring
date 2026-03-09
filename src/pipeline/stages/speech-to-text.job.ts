import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { reelsUrls, stories } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { extractAudio } from '@/media/extract-audio.js';
import { hasAudioStream } from '@/media/has-audio-stream.js';
import path from 'path';
import { classifyAudioContent, transcribeAudio } from '@/ai/openai-gateway.js';
import { withRetry } from '@/shared/async.js';
import { withJobTransition } from '@/pipeline/with-job-transition.js';
import { JOB_STATUS } from '@/shared/job-status.js';
import {
    AUDIO_CLASSIFICATION,
    hasCompletedAudioProcessing,
    TRANSCRIPTION_SENTINEL,
} from '@/shared/audio-analysis.js';

interface AudioProcessingItem {
    id: string;
    filepath: string | null;
    reason: string | null;
    transcription: string | null;
    audioClassification: string | null;
    audioClassificationConfidence: number | null;
}

interface AudioProcessingUpdate {
    transcription?: string | null;
    audioClassification?: string | null;
    audioClassificationConfidence?: number | null;
}

async function processVideoItem(
    itemType: 'reel' | 'story',
    item: AudioProcessingItem,
    persistUpdate: (id: string, update: AudioProcessingUpdate) => Promise<void>,
): Promise<void> {
    if (!item.filepath) {
        console.log(`[speechToText] Skipping ${itemType} ${item.id} - not downloaded (${item.reason || 'no reason'})`);

        const updatePayload: AudioProcessingUpdate = {};
        if (item.transcription === null) {
            updatePayload.transcription = TRANSCRIPTION_SENTINEL.NOT_DOWNLOADED;
        }
        if (item.audioClassification === null) {
            updatePayload.audioClassification = AUDIO_CLASSIFICATION.UNCLEAR;
            updatePayload.audioClassificationConfidence = 0;
        }
        if (Object.keys(updatePayload).length > 0) {
            await persistUpdate(item.id, updatePayload);
        }
        return;
    }

    if (hasCompletedAudioProcessing(item.transcription, item.audioClassification)) {
        return;
    }

    console.log(`[speechToText] Processing ${itemType} ${item.id}`);

    const hasStream = await hasAudioStream(item.filepath);
    if (!hasStream) {
        const updatePayload: AudioProcessingUpdate = {};
        if (item.transcription === null) {
            updatePayload.transcription = TRANSCRIPTION_SENTINEL.NO_AUDIO;
        }
        if (item.audioClassification === null) {
            updatePayload.audioClassification = AUDIO_CLASSIFICATION.SILENCE_OR_NOISE;
            updatePayload.audioClassificationConfidence = 100;
        }
        if (Object.keys(updatePayload).length > 0) {
            await persistUpdate(item.id, updatePayload);
        }
        return;
    }

    const audioPath = path.join(path.dirname(item.filepath), 'audio.mp3');
    await extractAudio(item.filepath, audioPath);

    const updatePayload: AudioProcessingUpdate = {};

    if (item.audioClassification === null) {
        try {
            const classification = await withRetry(() => classifyAudioContent(audioPath), 3, `classify ${itemType} ${item.id}`);
            updatePayload.audioClassification = classification.classification;
            updatePayload.audioClassificationConfidence = classification.confidence;
        } catch (error) {
            console.error(`[speechToText] failed to classify audio for ${itemType} ${item.id}:`, error);
            updatePayload.audioClassification = AUDIO_CLASSIFICATION.UNCLEAR;
            updatePayload.audioClassificationConfidence = 0;
        }
    }

    if (item.transcription === null) {
        try {
            updatePayload.transcription = await withRetry(() => transcribeAudio(audioPath), 3, `transcribe ${itemType} ${item.id}`);
        } catch (error) {
            console.error(`[speechToText] failed to transcribe audio for ${itemType} ${item.id}:`, error);
        }
    }

    if (Object.keys(updatePayload).length > 0) {
        await persistUpdate(item.id, updatePayload);
    }
}

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
            try {
                await processVideoItem('reel', reel, (id, update) =>
                    db.update(reelsUrls).set(update).where(eq(reelsUrls.id, id))
                );
            } catch (e) {
                console.error(`[speechToText] failed to process reel ${reel.id}:`, e);
            }
        }
        console.log(`[speechToText] Processed ${reels.length} reels`);

        for (const story of videoStories) {
            try {
                await processVideoItem('story', story, (id, update) =>
                    db.update(stories).set(update).where(eq(stories.id, id))
                );
            } catch (e) {
                console.error(`[speechToText] failed to process story ${story.id}:`, e);
            }
        }
        console.log(`[speechToText] Processed ${videoStories.length} stories`);
    })
);
