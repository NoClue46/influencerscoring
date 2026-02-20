import { db } from '@/infra/db/index.js';
import { reelsUrls } from '@/infra/db/schema.js';
import type { Reels, Comment } from '@/infra/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { analyzeComment } from '@/modules/ai/application/analyze-comment.js';
import { selectFrames } from '@/modules/media/domain/select-frames.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/modules/ai/prompts/post-analysis.prompt.js';
import { chunk } from '@/shared/utils/async.js';
import { encodeImageToDataUri } from '@/modules/ai/infra/encode-image.js';
import fs from 'fs';
import path from 'path';

const COMMENT_ANALYSIS_CHUNK_SIZE = 5;

export async function analyzeReels(
    reels: (Reels & { comments: Comment[] })[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    for (const reel of reels) {
        if (!reel.filepath) {
            console.log(`[analyze] Skipping reel ${reel.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing reel ${reel.id}`);

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

            // Avatar first
            if (avatarPath && fs.existsSync(avatarPath)) {
                imageContent.push({ type: 'image', image: encodeImageToDataUri(avatarPath) });
            }

            // Content frames
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

            await db.update(reelsUrls).set({
                hasBloggerFace: output.has_blogger_face,
                analyzeRawText: JSON.stringify(output),
            }).where(eq(reelsUrls.id, reel.id));

            // Analyze reel comments
            for (const commentsBatch of chunk(reel.comments, COMMENT_ANALYSIS_CHUNK_SIZE)) {
                const results = await Promise.allSettled(commentsBatch.map((comment) => analyzeComment(comment)));

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        return;
                    }

                    const comment = commentsBatch[index];
                    const message = result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason);

                    console.error(`[analyze] Failed for comment ${comment.id}:`, message);
                    errors.push(`Comment ${comment.id}: ${message}`);
                });
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
