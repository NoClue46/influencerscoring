import { db } from '@/infra/db/index.js';
import { stories } from '@/infra/db/schema.js';
import type { Story } from '@/infra/db/types.js';
import { eq } from 'drizzle-orm';
import { askOpenai } from '@/modules/ai/infra/openai-gateway.js';
import { selectFrames } from '@/modules/media/domain/select-frames.js';
import fs from 'fs';
import path from 'path';

export async function analyzeStories(
    allStories: Story[],
    postPrompt: string
): Promise<string[]> {
    const errors: string[] = [];

    // Analyze video stories
    const videoStories = allStories.filter(s => s.isVideo);
    for (const story of videoStories) {
        if (!story.filepath) {
            console.log(`[analyze] Skipping video story ${story.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing video story ${story.id}`);

            const framesDir = path.join(path.dirname(story.filepath), 'frames');

            const allFrames = fs.readdirSync(framesDir)
                .filter(f => f.endsWith('.jpg'))
                .sort()
                .map(f => path.join(framesDir, f));

            const selectedFrames = selectFrames(allFrames, 10);
            const promptWithTranscription = story.transcription
                ? `${postPrompt}\n\nTranscription:\n${story.transcription}`
                : postPrompt;
            const result = await askOpenai(selectedFrames, promptWithTranscription);

            await db.update(stories).set({ analyzeRawText: result.text }).where(eq(stories.id, story.id));

            console.log(`[analyze] Completed video story ${story.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for video story ${story.id}:`, err.message);
            errors.push(`Video story ${story.id}: ${err.message}`);
        }
    }

    // Analyze image stories
    const imageStories = allStories.filter(s => !s.isVideo);
    for (const story of imageStories) {
        if (!story.filepath) {
            console.log(`[analyze] Skipping image story ${story.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing image story ${story.id}`);

            const result = await askOpenai([story.filepath], postPrompt);

            await db.update(stories).set({ analyzeRawText: result.text }).where(eq(stories.id, story.id));

            console.log(`[analyze] Completed image story ${story.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for image story ${story.id}:`, err.message);
            errors.push(`Image story ${story.id}: ${err.message}`);
        }
    }

    return errors;
}
