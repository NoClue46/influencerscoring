import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { fetchPosts, fetchReels, fetchStories, fetchComments } from '../scrape-creators/index.js';
import { withJobTransition } from './with-job-transition.js';

export const fetchJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'redflag_checking_finished',
        startedStatus: 'fetching_started',
        finishedStatus: 'fetching_finished',
        jobName: 'fetch'
    }, async (job) => {
        // Check existing posts/reels from redflag check
        const [existingPosts, existingReels] = await Promise.all([
            prisma.post.count({ where: { jobId: job.id } }),
            prisma.reels.count({ where: { jobId: job.id } })
        ]);

        const remainingPosts = Math.max(0, job.postNumber - existingPosts);
        const remainingReels = Math.max(0, job.postNumber - existingReels);

        console.log(`[fetch] Existing: ${existingPosts} posts, ${existingReels} reels. Fetching: ${remainingPosts} posts, ${remainingReels} reels`);

        // Get existing URLs to avoid duplicates
        const [existingPostsList, existingReelsList] = await Promise.all([
            prisma.post.findMany({ where: { jobId: job.id }, select: { postUrl: true } }),
            prisma.reels.findMany({ where: { jobId: job.id }, select: { reelsUrl: true } })
        ]);
        const existingPostUrls = new Set(existingPostsList.map(p => p.postUrl));
        const existingReelUrls = new Set(existingReelsList.map(r => r.reelsUrl));

        // Fetch only remaining content (followers already saved by redflag-check)
        const [reels, posts, stories] = await Promise.all([
            remainingReels > 0 ? fetchReels(job.username, job.postNumber, existingReelUrls) : [],
            remainingPosts > 0 ? fetchPosts(job.username, job.postNumber, existingPostUrls) : [],
            fetchStories(job.username, job.postNumber)
        ])

        // Filter out already existing items
        const newPosts = posts.filter(p => !existingPostUrls.has(p.url));
        const newReels = reels.filter(r => !existingReelUrls.has(r.url));

        console.log(`[fetch] Creating ${newPosts.length} new posts, ${newReels.length} new reels, ${stories.length} stories`);

        await Promise.all([
            newPosts.length > 0 ? prisma.post.createMany({
                data: newPosts.map((p) => ({
                    jobId: job.id,
                    postUrl: p.url,
                    downloadUrl: p.downloadUrl,
                    isVideo: p.isVideo,
                    commentCount: p.commentCount,
                    commentEr: job.followers > 0 ? p.commentCount / job.followers : 0
                }))
            }) : Promise.resolve(),
            newReels.length > 0 ? prisma.reels.createMany({
                data: newReels.map((r) => ({
                    jobId: job.id,
                    reelsUrl: r.url,
                    downloadUrl: r.downloadUrl,
                    commentCount: r.commentCount,
                    commentEr: job.followers > 0 ? r.commentCount / job.followers : 0
                }))
            }) : Promise.resolve(),
            prisma.story.createMany({
                data: stories.map((s) => ({
                    jobId: job.id,
                    storyId: s.id,
                    downloadUrl: s.downloadUrl,
                    isVideo: s.isVideo
                }))
            })
        ])

        // Fetch and save comments only for posts/reels without comments
        const [postsWithoutComments, reelsWithoutComments] = await Promise.all([
            prisma.post.findMany({
                where: { jobId: job.id },
                include: { comments: { take: 1 } }
            }),
            prisma.reels.findMany({
                where: { jobId: job.id },
                include: { comments: { take: 1 } }
            })
        ]);

        for (const post of postsWithoutComments) {
            if (post.comments.length > 0) continue; // Skip if already has comments
            const comments = await fetchComments(post.postUrl);
            console.log(`[fetch] Post ${post.postUrl}: fetched ${comments.length} comments`);
            if (comments.length > 0) {
                await prisma.comment.createMany({
                    data: comments.map(c => ({
                        postId: post.id,
                        text: c.text
                    }))
                });
            }
        }

        for (const reel of reelsWithoutComments) {
            if (reel.comments.length > 0) continue; // Skip if already has comments
            const comments = await fetchComments(reel.reelsUrl);
            console.log(`[fetch] Reel ${reel.reelsUrl}: fetched ${comments.length} comments`);
            if (comments.length > 0) {
                await prisma.comment.createMany({
                    data: comments.map(c => ({
                        reelsId: reel.id,
                        text: c.text
                    }))
                });
            }
        }
    })
);
