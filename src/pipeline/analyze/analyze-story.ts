import { db } from '@/db/index.js';
import { stories } from '@/db/schema.js';
import type { Story } from '@/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { selectFrames } from '@/media/select-frames.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/ai/encode-image.js';
import { applyTalkingHeadAudioOverride, buildPromptWithAudioContext } from '@/pipeline/analyze/audio-gating.js';
import { chunk } from '@/shared/async.js';
import fs from 'fs';
import path from 'path';

async function processStory(
    story: Story,
    avatarPath: string | null
): Promise<string[]> {
    if (!story.filepath) {
        console.log(`[analyze] Skipping story ${story.id} - not downloaded`);
        return [];
    }
    if (story.analyzeRawText) {
        return [];
    }

    try {
        console.log(`[analyze] Processing story ${story.id}`);

        const imageContent: Array<{ type: 'image'; image: string }> = [];

        // Avatar first
        if (avatarPath && fs.existsSync(avatarPath)) {
            imageContent.push({ type: 'image', image: encodeImageToDataUri(avatarPath) });
        }

        if (story.isVideo) {
            const framesDir = path.join(path.dirname(story.filepath), 'frames');
            const allFrames = fs.readdirSync(framesDir)
                .filter(f => f.endsWith('.jpg'))
                .sort()
                .map(f => path.join(framesDir, f));

            const selectedFrames = selectFrames(allFrames, 10);
            for (const frame of selectedFrames) {
                imageContent.push({ type: 'image', image: encodeImageToDataUri(frame) });
            }
        } else {
            imageContent.push({ type: 'image', image: encodeImageToDataUri(story.filepath) });
        }

        const promptWithAudioContext = buildPromptWithAudioContext(POST_ANALYSIS_PROMPT, {
            transcription: story.transcription,
            audioClassification: story.audioClassification,
            audioClassificationConfidence: story.audioClassificationConfidence,
        });

        const { output } = await generateText({
            model: openai('gpt-5-mini'),
            output: Output.object({ schema: perItemAnalysisSchema }),
            messages: [{
                role: 'user',
                content: [
                    ...imageContent,
                    { type: 'text', text: promptWithAudioContext },
                ],
            }],
        });

        const finalOutput = applyTalkingHeadAudioOverride(
            output,
            story.audioClassification,
            story.audioClassificationConfidence,
        );

        await db.update(stories).set({
            hasBloggerFace: finalOutput.has_blogger_face,
            analyzeRawText: JSON.stringify(finalOutput),
        }).where(eq(stories.id, story.id));

        console.log(`[analyze] Completed story ${story.id}`);
        return [];
    } catch (error) {
        const err = error as Error;
        console.error(`[analyze] Failed for story ${story.id}:`, err.message);
        return [`Story ${story.id}: ${err.message}`];
    }
}

export async function analyzeStories(
    allStories: Story[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    const batches = chunk(allStories, 3);
    for (const batch of batches) {
        const batchResults = await Promise.all(batch.map(story => processStory(story, avatarPath)));
        errors.push(...batchResults.flat());
    }

    return errors;
}
