import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { withJobTransition } from './with-job-transition.js';
import { analyzePosts } from './analyze/analyze-post.js';
import { analyzeReels } from './analyze/analyze-reel.js';
import { analyzeStories } from './analyze/analyze-story.js';
import { runFullBloggerAnalysis } from './analyze/full-blogger-analysis.js';

export const analyzeJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'speech_to_text_finished',
        startedStatus: 'analyzing_started',
        finishedStatus: 'analyzing_finished',
        jobName: 'analyze'
    }, async (job) => {
        const [reels, posts, stories] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id }, include: { comments: true } }),
            prisma.post.findMany({ where: { jobId: job.id }, include: { comments: true } }),
            prisma.story.findMany({ where: { jobId: job.id } })
        ])

        const errors: string[] = [];

        // Analyze reels
        const reelErrors = await analyzeReels(reels, job.postPrompt);
        errors.push(...reelErrors);

        // Analyze posts
        const postErrors = await analyzePosts(posts, job.postPrompt);
        errors.push(...postErrors);

        // Analyze stories
        const storyErrors = await analyzeStories(stories, job.postPrompt);
        errors.push(...storyErrors);

        if (errors.length > 0) {
            throw new Error(`Analysis completed with errors: ${errors.join('; ')}`);
        }

        // If not full analysis, let withJobTransition set analyzing_finished
        if (!job.allVideos) {
            return;
        }

        await runFullBloggerAnalysis(job);
    })
);
