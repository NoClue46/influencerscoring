import { db } from '@/db/index.js';
import { reelsUrls } from '@/db/schema.js';
import type { Reels, Comment } from '@/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { analyzeItemComments } from '@/ai/analyze-item-comments.js';
import { selectFrames } from '@/media/select-frames.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/ai/encode-image.js';
import { applyTalkingHeadAudioOverride, buildPromptWithAudioContext } from '@/pipeline/analyze/audio-gating.js';
import { chunk } from '@/shared/async.js';
import fs from 'fs';
import path from 'path';

async function processReel(
    reel: Reels & { comments: Comment[] },
    avatarPath: string | null
): Promise<string[]> {
    const hasContentAnalysis = reel.analyzeRawText !== null;
    const hasCommentsAnalysis = reel.commentsAnalysisRawText !== null;

    if (hasContentAnalysis && hasCommentsAnalysis) {
        return [];
    }

    try {
        const updatePayload: {
            hasBloggerFace?: boolean;
            analyzeRawText?: string;
            commentsAnalysisRawText?: string | null;
        } = {};

        if (!hasContentAnalysis) {
            if (!reel.filepath) {
                console.log(`[analyze] Skipping reel ${reel.id} - not downloaded`);
                return [];
            }

            const framesDir = path.join(path.dirname(reel.filepath), 'frames');

            const allFrames = fs.readdirSync(framesDir)
                .filter(f => f.endsWith('.jpg'))
                .sort()
                .map(f => path.join(framesDir, f));

            const selectedFrames = selectFrames(allFrames, 10);

            const promptWithAudioContext = buildPromptWithAudioContext(POST_ANALYSIS_PROMPT, {
                transcription: reel.transcription,
                audioClassification: reel.audioClassification,
                audioClassificationConfidence: reel.audioClassificationConfidence,
            });

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
                        { type: 'text', text: promptWithAudioContext },
                    ],
                }],
            });

            const finalOutput = applyTalkingHeadAudioOverride(
                output,
                reel.audioClassification,
                reel.audioClassificationConfidence,
            );

            updatePayload.hasBloggerFace = finalOutput.has_blogger_face;
            updatePayload.analyzeRawText = JSON.stringify(finalOutput);
        }

        if (!hasCommentsAnalysis) {
            updatePayload.commentsAnalysisRawText = await analyzeItemComments(reel.comments);
        }

        if (Object.keys(updatePayload).length > 0) {
            await db.update(reelsUrls).set(updatePayload).where(eq(reelsUrls.id, reel.id));
        }

        return [];
    } catch (error) {
        const err = error as Error;
        console.error(`[analyze] Failed for reel ${reel.id}:`, err.message);
        return [`Reel ${reel.id}: ${err.message}`];
    }
}

export async function analyzeReels(
    reels: (Reels & { comments: Comment[] })[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    const batches = chunk(reels, 3);
    for (const batch of batches) {
        const batchResults = await Promise.all(batch.map(reel => processReel(reel, avatarPath)));
        errors.push(...batchResults.flat());
    }

    console.log(`[analyze] Reels: ${reels.length - errors.length}/${reels.length} ok`);
    return errors;
}
