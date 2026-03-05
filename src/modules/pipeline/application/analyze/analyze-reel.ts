import { db } from '@/infra/db/index.js';
import { reelsUrls } from '@/infra/db/schema.js';
import type { Reels, Comment } from '@/infra/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { analyzeItemComments } from '@/modules/ai/application/analyze-item-comments.js';
import { selectFrames } from '@/modules/media/domain/select-frames.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/modules/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/modules/ai/infra/encode-image.js';
import fs from 'fs';
import path from 'path';

export async function analyzeReels(
    reels: (Reels & { comments: Comment[] })[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    for (const reel of reels) {
        const hasContentAnalysis = reel.analyzeRawText !== null;
        const hasCommentsAnalysis = reel.commentsAnalysisRawText !== null;

        if (hasContentAnalysis && hasCommentsAnalysis) {
            continue;
        }

        try {
            console.log(`[analyze] Processing reel ${reel.id}`);

            const updatePayload: {
                hasBloggerFace?: boolean;
                analyzeRawText?: string;
                commentsAnalysisRawText?: string | null;
            } = {};

            if (!hasContentAnalysis) {
                if (!reel.filepath) {
                    console.log(`[analyze] Skipping reel ${reel.id} - not downloaded`);
                    continue;
                }

                const framesDir = path.join(path.dirname(reel.filepath), 'frames');

                const allFrames = fs.readdirSync(framesDir)
                    .filter(f => f.endsWith('.jpg'))
                    .sort()
                    .map(f => path.join(framesDir, f));

                const selectedFrames = selectFrames(allFrames, 10);

                const promptWithTranscription = reel.transcription
                    ? `${POST_ANALYSIS_PROMPT}\n\nTranscription:\n${reel.transcription}`
                    : POST_ANALYSIS_PROMPT;

                const imageContent: Array<{ type: 'image'; image: string }> = [];

                if (avatarPath && fs.existsSync(avatarPath)) {
                    imageContent.push({ type: 'image', image: encodeImageToDataUri(avatarPath) });
                }

                for (const frame of selectedFrames) {
                    imageContent.push({ type: 'image', image: encodeImageToDataUri(frame) });
                }

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

                updatePayload.hasBloggerFace = output.has_blogger_face;
                updatePayload.analyzeRawText = JSON.stringify(output);
            }

            if (!hasCommentsAnalysis) {
                updatePayload.commentsAnalysisRawText = await analyzeItemComments(reel.comments);
            }

            if (Object.keys(updatePayload).length > 0) {
                await db.update(reelsUrls).set(updatePayload).where(eq(reelsUrls.id, reel.id));
            }

            console.log(`[analyze] Completed reel ${reel.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for reel ${reel.id}:`, err.message);
            errors.push(`Reel ${reel.id}: ${err.message}`);
        }
    }

    return errors;
}
