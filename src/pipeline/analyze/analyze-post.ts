import { db } from '@/db/index.js';
import { posts } from '@/db/schema.js';
import type { Post, Comment } from '@/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { analyzeItemComments } from '@/ai/analyze-item-comments.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/ai/encode-image.js';
import { chunk } from '@/shared/async.js';
import fs from 'fs';

async function processPost(
    post: Post & { comments: Comment[] },
    avatarPath: string | null
): Promise<string[]> {
    const hasContentAnalysis = post.analyzeRawText !== null;
    const hasCommentsAnalysis = post.commentsAnalysisRawText !== null;

    if (hasContentAnalysis && hasCommentsAnalysis) {
        return [];
    }

    try {
        console.log(`[analyze] Processing post ${post.id}`);

        const updatePayload: {
            hasBloggerFace?: boolean;
            analyzeRawText?: string;
            commentsAnalysisRawText?: string | null;
        } = {};

        if (!hasContentAnalysis) {
            if (!post.filepath) {
                console.log(`[analyze] Skipping post ${post.id} - not downloaded`);
                return [];
            }

            const imageContent: Array<{ type: 'image'; image: string }> = [];

            if (avatarPath && fs.existsSync(avatarPath)) {
                imageContent.push({ type: 'image', image: encodeImageToDataUri(avatarPath) });
            }

            imageContent.push({ type: 'image', image: encodeImageToDataUri(post.filepath) });

            const { output } = await generateText({
                model: openai('gpt-5-mini'),
                output: Output.object({ schema: perItemAnalysisSchema }),
                messages: [{
                    role: 'user',
                    content: [
                        ...imageContent,
                        { type: 'text', text: POST_ANALYSIS_PROMPT },
                    ],
                }],
            });

            updatePayload.hasBloggerFace = output.has_blogger_face;
            updatePayload.analyzeRawText = JSON.stringify(output);
        }

        if (!hasCommentsAnalysis) {
            updatePayload.commentsAnalysisRawText = await analyzeItemComments(post.comments);
        }

        if (Object.keys(updatePayload).length > 0) {
            await db.update(posts).set(updatePayload).where(eq(posts.id, post.id));
        }

        console.log(`[analyze] Completed post ${post.id}`);
        return [];
    } catch (error) {
        const err = error as Error;
        console.error(`[analyze] Failed for post ${post.id}:`, err.message);
        return [`Post ${post.id}: ${err.message}`];
    }
}

export async function analyzePosts(
    allPosts: (Post & { comments: Comment[] })[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    const batches = chunk(allPosts, 3);
    for (const batch of batches) {
        const batchResults = await Promise.all(batch.map(post => processPost(post, avatarPath)));
        errors.push(...batchResults.flat());
    }

    return errors;
}
