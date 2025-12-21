import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { fetchPosts, fetchReels, fetchStories, fetchComments, fetchProfile } from '../scrape-creators.js';

export const fetchJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'pending' }
    });

    if (!job) return;

    console.log(`[fetch] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'fetching_started' }
        });

        const [reels, posts, stories, profile] = await Promise.all([
            fetchReels(job.username, job.postNumber),
            fetchPosts(job.username, job.postNumber),
            fetchStories(job.username, job.postNumber),
            fetchProfile(job.username, true)
        ])

        await Promise.all([
            prisma.post.createMany({
                data: [
                    ...posts.map((p) => ({
                        jobId: job.id,
                        postUrl: p.url,
                        downloadUrl: p.downloadUrl,
                        isVideo: p.isVideo,
                        commentCount: p.commentCount,
                        commentRate: p.isVideo && p.viewCount > 0 ? p.commentCount / p.viewCount : 0
                    }))
                ]
            }),
            prisma.reels.createMany({
                data: [
                    ...reels.map((r) => ({
                        jobId: job.id,
                        reelsUrl: r.url,
                        downloadUrl: r.downloadUrl,
                        commentCount: r.commentCount,
                        commentRate: r.viewCount > 0 ? r.commentCount / r.viewCount : 0
                    }))
                ]
            }),
            prisma.story.createMany({
                data: [
                    ...stories.map((s) => ({
                        jobId: job.id,
                        storyId: s.id,
                        downloadUrl: s.downloadUrl,
                        isVideo: s.isVideo
                    }))
                ]
            })
        ])

        // Fetch and save comments for posts and reels
        const [createdPosts, createdReels] = await Promise.all([
            prisma.post.findMany({ where: { jobId: job.id } }),
            prisma.reels.findMany({ where: { jobId: job.id } })
        ]);

        for (const post of createdPosts) {
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

        for (const reel of createdReels) {
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

        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'fetching_finished',
                followers: profile?.edge_followed_by?.count ?? 0
            }
        });

        console.log(`[fetch] Completed successfully for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[fetch] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'pending', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});
