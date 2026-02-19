import { prisma } from '../../prisma.js';
import { askOpenai } from '../../ask-openai.js';
import { analyzeComment } from '../../utils/ai/analyze-comment.js';
import type { Post, Comment } from '@prisma/client';

export async function analyzePosts(
    posts: (Post & { comments: Comment[] })[],
    postPrompt: string
): Promise<string[]> {
    const errors: string[] = [];

    for (const post of posts) {
        if (!post.filepath) {
            console.log(`[analyze] Skipping post ${post.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing post ${post.id}`);

            const result = await askOpenai([post.filepath], postPrompt);

            await prisma.post.update({
                where: { id: post.id },
                data: { analyzeRawText: result.text }
            });

            // Analyze post comments
            for (const comment of post.comments) {
                try {
                    await analyzeComment(comment);
                } catch (error) {
                    const err = error as Error;
                    console.error(`[analyze] Failed for comment ${comment.id}:`, err.message);
                    errors.push(`Comment ${comment.id}: ${err.message}`);
                }
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
