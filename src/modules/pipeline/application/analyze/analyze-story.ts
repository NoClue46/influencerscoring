import { db } from '@/infra/db/index.js';
import { stories } from '@/infra/db/schema.js';
import type { Story } from '@/infra/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { selectFrames } from '@/modules/media/domain/select-frames.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/modules/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/modules/ai/infra/encode-image.js';
import fs from 'fs';
import path from 'path';

export async function analyzeStories(
    allStories: Story[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    for (const story of allStories) {
        if (!story.filepath) {
            console.log(`[analyze] Skipping story ${story.id} - not downloaded`);
            continue;
        }
        if (story.analyzeRawText) {
            continue;
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

            const promptWithTranscription = story.transcription
                ? `${POST_ANALYSIS_PROMPT}\n\nTranscription:\n${story.transcription}`
                : POST_ANALYSIS_PROMPT;

            const { output } = await generateText({
                model: openai('gpt-5-mini'),
                output: Output.object({ schema: perItemAnalysisSchema }),
                messages: [{
                    role: 'user',
                    content: [
                        ...imageContent,
                        { type: 'text', text: promptWithTranscription },
                    ],
                }],
            });

            await db.update(stories).set({
                hasBloggerFace: output.has_blogger_face,
                analyzeRawText: JSON.stringify(output),
            }).where(eq(stories.id, story.id));

            console.log(`[analyze] Completed story ${story.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for story ${story.id}:`, err.message);
            errors.push(`Story ${story.id}: ${err.message}`);
        }
    }

    return errors;
}
