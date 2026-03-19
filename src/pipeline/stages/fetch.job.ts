import { CronJob } from 'cron';
import { db } from '@/db/index.js';
import { posts, reelsUrls, stories, comments } from '@/db/schema.js';
import { eq, count } from 'drizzle-orm';
import { fetchPosts, fetchReels, fetchStories, fetchComments } from '@/instagram/scrape-creators/index.js';
import { withJobTransition } from '@/pipeline/with-job-transition.js';
import { JOB_STATUS } from '@/shared/job-status.js';
import { STORY_SOURCE } from '@/shared/story-source.js';
import { chunk } from '@/shared/async';


export const fetchJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.REDFLAG_CHECKING_FINISHED,
        startedStatus: JOB_STATUS.FETCHING_STARTED,
        finishedStatus: JOB_STATUS.FETCHING_FINISHED,
        jobName: 'fetch'
    }, async (job) => {
        // Check existing posts/reels from redflag check
        const [existingPostsCount, existingReelsCount, existingStoriesCount] = await Promise.all([
            db.select({ value: count() }).from(posts).where(eq(posts.jobId, job.id)),
            db.select({ value: count() }).from(reelsUrls).where(eq(reelsUrls.jobId, job.id)),
            db.select({ value: count() }).from(stories).where(eq(stories.jobId, job.id))
        ]);

        const existingPosts = existingPostsCount[0].value;
        const existingReels = existingReelsCount[0].value;
        const existingStories = existingStoriesCount[0].value;

        const remainingPosts = Math.max(0, job.postNumber - existingPosts);
        const remainingReels = Math.max(0, job.postNumber - existingReels);

        console.log(`[fetch] Existing: ${existingPosts} posts, ${existingReels} reels, ${existingStories} stories. Fetching: ${remainingPosts} posts, ${remainingReels} reels`);

        // Get existing URLs to avoid duplicates
        const [existingPostsList, existingReelsList] = await Promise.all([
            db.select({ postUrl: posts.postUrl }).from(posts).where(eq(posts.jobId, job.id)),
            db.select({ reelsUrl: reelsUrls.reelsUrl }).from(reelsUrls).where(eq(reelsUrls.jobId, job.id))
        ]);
        const existingPostUrls = new Set(existingPostsList.map(p => p.postUrl));
        const existingReelUrls = new Set(existingReelsList.map(r => r.reelsUrl));

        // Fetch only remaining content (followers already saved by redflag-check)
        const [reels, fetchedPosts, fetchedStories] = await Promise.all([
            remainingReels > 0 ? fetchReels(job.username, job.postNumber, existingReelUrls) : [],
            remainingPosts > 0 ? fetchPosts(job.username, job.postNumber, existingPostUrls) : [],
            existingStories === 0 ? fetchStories(job.username, job.postNumber) : []
        ]);

        // Filter out already existing items
        const newPosts = fetchedPosts.filter(p => !existingPostUrls.has(p.url));
        const newReels = reels.filter(r => !existingReelUrls.has(r.url));

        console.log(`[fetch] Creating ${newPosts.length} new posts, ${newReels.length} new reels, ${fetchedStories.length} stories`);

        await Promise.all([
            newPosts.length > 0 ? db.insert(posts).values(newPosts.map((p) => ({
                jobId: job.id,
                postUrl: p.url,
                downloadUrl: p.downloadUrl,
                isVideo: p.isVideo,
                commentCount: p.commentCount,
                commentEr: job.followers > 0 ? (p.commentCount / (job.followers * 0.07)) * 100 : 0,
                caption: p.caption,
            }))) : Promise.resolve(),
            newReels.length > 0 ? db.insert(reelsUrls).values(newReels.map((r) => ({
                jobId: job.id,
                reelsUrl: r.url,
                downloadUrl: r.downloadUrl,
                commentCount: r.commentCount,
                commentEr: job.followers > 0 ? (r.commentCount / (job.followers * 0.07)) * 100 : 0,
                caption: r.caption,
            }))) : Promise.resolve(),
            fetchedStories.length > 0 ? db.insert(stories).values(fetchedStories.map((s) => ({
                jobId: job.id,
                storyId: s.id,
                downloadUrl: s.downloadUrl,
                isVideo: s.isVideo,
                source: STORY_SOURCE.HIGHLIGHTS,
            }))) : Promise.resolve()
        ]);

        // Fetch and save comments only for posts/reels without comments
        const [postsWithComments, reelsWithComments] = await Promise.all([
            db.query.posts.findMany({
                where: eq(posts.jobId, job.id),
                with: { comments: { limit: 1 } }
            }),
            db.query.reelsUrls.findMany({
                where: eq(reelsUrls.jobId, job.id),
                with: { comments: { limit: 1 } }
            })
        ]);

        let postsWithFetchedComments = 0;
        for (const batch of chunk(postsWithComments, 1)) {
            await Promise.all(batch.filter(post => post.comments.length === 0).map(async (post) => {
                const fetchedComments = await fetchComments(post.postUrl);
                if (fetchedComments.length > 0) {
                    await db.insert(comments).values(fetchedComments.map(c => ({
                        postId: post.id,
                        text: c.text
                    })));
                }
                postsWithFetchedComments++;
            }));
        }

        let reelsWithFetchedComments = 0;
        for (const batch of chunk(reelsWithComments, 1)) {
            await Promise.all(batch.filter(reel => reel.comments.length === 0).map(async (reel) => {
                const fetchedComments = await fetchComments(reel.reelsUrl);
                if (fetchedComments.length > 0) {
                    await db.insert(comments).values(fetchedComments.map(c => ({
                        reelsId: reel.id,
                        text: c.text
                    })));
                }
                reelsWithFetchedComments++;
            }));
        }

        console.log(`[fetch] Fetched comments for ${postsWithFetchedComments} posts, ${reelsWithFetchedComments} reels`);
    })
);
