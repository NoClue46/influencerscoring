import { db } from '@/infra/db/index.js';
import { posts } from '@/infra/db/schema.js';
import type { Post, Comment } from '@/infra/db/types.js';
import { eq } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { analyzeComment } from '@/modules/ai/application/analyze-comment.js';
import { perItemAnalysisSchema, POST_ANALYSIS_PROMPT } from '@/modules/ai/prompts/post-analysis.prompt.js';
import { encodeImageToDataUri } from '@/modules/ai/infra/encode-image.js';
import { chunk } from '@/shared/utils/async.js';
import fs from 'fs';

const COMMENT_ANALYSIS_CHUNK_SIZE = 5;

export async function analyzePosts(
    allPosts: (Post & { comments: Comment[] })[],
    avatarPath: string | null
): Promise<string[]> {
    const errors: string[] = [];

    for (const post of allPosts) {
        if (!post.filepath) {
            console.log(`[analyze] Skipping post ${post.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing post ${post.id}`);

            const imageContent: Array<{ type: 'image'; image: string }> = [];

            // Avatar first
            if (avatarPath && fs.existsSync(avatarPath)) {
                imageContent.push({ type: 'image', image: encodeImageToDataUri(avatarPath) });
            }

            // Content image
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

            await db.update(posts).set({
                hasBloggerFace: output.has_blogger_face,
                analyzeRawText: JSON.stringify(output),
            }).where(eq(posts.id, post.id));

            // Analyze post comments
            for (const commentsBatch of chunk(post.comments, COMMENT_ANALYSIS_CHUNK_SIZE)) {
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

            console.log(`[analyze] Completed post ${post.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for post ${post.id}:`, err.message);
            errors.push(`Post ${post.id}: ${err.message}`);
        }
    }

    return errors;
}
