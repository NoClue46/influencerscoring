import { db } from '@/infra/db/index.js';
import { posts, reelsUrls, stories } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { detectInImage, detectInVideoFrames } from '@/modules/ai/application/detect-blogger-face.js';
import { getSelectedFrames } from '@/modules/pipeline/application/analyze/get-selected-frames.js';

const FACE_DETECTION_CHUNK_SIZE = 3;

type PostForFaceDetection = {
    id: string;
    filepath: string | null;
};

type ReelForFaceDetection = {
    id: string;
    filepath: string | null;
};

type StoryForFaceDetection = {
    id: string;
    filepath: string | null;
    isVideo: boolean;
};

async function processInChunks<T>(
    items: T[],
    processItem: (item: T) => Promise<void>,
    chunkSize = FACE_DETECTION_CHUNK_SIZE
): Promise<void> {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map((item) => processItem(item)));
    }
}

export async function markAllContentWithoutBloggerFace(jobId: string): Promise<void> {
    await Promise.all([
        db.update(posts).set({ hasBloggerFace: false }).where(eq(posts.jobId, jobId)),
        db.update(reelsUrls).set({ hasBloggerFace: false }).where(eq(reelsUrls.jobId, jobId)),
        db.update(stories).set({ hasBloggerFace: false }).where(eq(stories.jobId, jobId))
    ]);
}

export async function detectPostsBloggerFace(
    avatarPath: string,
    allPosts: PostForFaceDetection[]
): Promise<void> {
    console.log(`[analyze] Face detection started for posts: ${allPosts.length}, chunkSize=${FACE_DETECTION_CHUNK_SIZE}`);

    let processed = 0;
    let matched = 0;
    let skipped = 0;

    await processInChunks(allPosts, async (post) => {
        let hasBloggerFace = false;

        if (!post.filepath) {
            skipped++;
        } else {
            processed++;

            try {
                hasBloggerFace = await detectInImage(avatarPath, post.filepath);
            } catch (error) {
                const err = error as Error;
                console.warn(`[analyze] Failed face detection for post ${post.id}: ${err.message}`);
            }
        }

        if (hasBloggerFace) {
            matched++;
        }

        try {
            await db.update(posts).set({ hasBloggerFace }).where(eq(posts.id, post.id));
        } catch (error) {
            const err = error as Error;
            console.warn(`[analyze] Failed hasBloggerFace update for post ${post.id}: ${err.message}`);
        }
    });

    console.log(`[analyze] Face detection completed for posts: processed=${processed}, matched=${matched}, skipped=${skipped}`);
}

export async function detectReelsBloggerFace(
    avatarPath: string,
    reels: ReelForFaceDetection[]
): Promise<void> {
    console.log(`[analyze] Face detection started for reels: ${reels.length}, chunkSize=${FACE_DETECTION_CHUNK_SIZE}`);

    let processed = 0;
    let matched = 0;
    let skipped = 0;

    await processInChunks(reels, async (reel) => {
        let hasBloggerFace = false;

        if (!reel.filepath) {
            skipped++;
        } else {
            processed++;

            try {
                const selectedFrames = getSelectedFrames(reel.filepath);
                hasBloggerFace = await detectInVideoFrames(avatarPath, selectedFrames);
            } catch (error) {
                const err = error as Error;
                console.warn(`[analyze] Failed face detection for reel ${reel.id}: ${err.message}`);
            }
        }

        if (hasBloggerFace) {
            matched++;
        }

        try {
            await db.update(reelsUrls).set({ hasBloggerFace }).where(eq(reelsUrls.id, reel.id));
        } catch (error) {
            const err = error as Error;
            console.warn(`[analyze] Failed hasBloggerFace update for reel ${reel.id}: ${err.message}`);
        }
    });

    console.log(`[analyze] Face detection completed for reels: processed=${processed}, matched=${matched}, skipped=${skipped}`);
}

export async function detectStoriesBloggerFace(
    avatarPath: string,
    allStories: StoryForFaceDetection[]
): Promise<void> {
    console.log(`[analyze] Face detection started for stories: ${allStories.length}, chunkSize=${FACE_DETECTION_CHUNK_SIZE}`);

    let processed = 0;
    let matched = 0;
    let skipped = 0;

    await processInChunks(allStories, async (story) => {
        let hasBloggerFace = false;

        if (!story.filepath) {
            skipped++;
        } else {
            processed++;

            try {
                if (story.isVideo) {
                    const selectedFrames = getSelectedFrames(story.filepath);
                    hasBloggerFace = await detectInVideoFrames(avatarPath, selectedFrames);
                } else {
                    hasBloggerFace = await detectInImage(avatarPath, story.filepath);
                }
            } catch (error) {
                const err = error as Error;
                console.warn(`[analyze] Failed face detection for story ${story.id}: ${err.message}`);
            }
        }

        if (hasBloggerFace) {
            matched++;
        }

        try {
            await db.update(stories).set({ hasBloggerFace }).where(eq(stories.id, story.id));
        } catch (error) {
            const err = error as Error;
            console.warn(`[analyze] Failed hasBloggerFace update for story ${story.id}: ${err.message}`);
        }
    });

    console.log(`[analyze] Face detection completed for stories: processed=${processed}, matched=${matched}, skipped=${skipped}`);
}
