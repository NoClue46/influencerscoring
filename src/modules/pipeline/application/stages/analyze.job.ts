import { CronJob } from 'cron';
import fs from 'fs';
import { db } from '@/infra/db/index.js';
import { reelsUrls, posts, stories } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';
import { getAvatarPath } from '@/infra/storage/files/paths.js';
import { withJobTransition } from '@/modules/pipeline/application/orchestrator/with-job-transition.js';
import { analyzePosts } from '@/modules/pipeline/application/analyze/analyze-post.js';
import { analyzeReels } from '@/modules/pipeline/application/analyze/analyze-reel.js';
import { analyzeStories } from '@/modules/pipeline/application/analyze/analyze-story.js';
import { runFullBloggerAnalysis } from '@/modules/pipeline/application/analyze/full-blogger-analysis.js';
import {
    detectPostsBloggerFace,
    detectReelsBloggerFace,
    detectStoriesBloggerFace,
    markAllContentWithoutBloggerFace
} from '@/modules/pipeline/application/analyze/detect-blogger-face-content.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

export const analyzeJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: JOB_STATUS.SPEECH_TO_TEXT_FINISHED,
        startedStatus: JOB_STATUS.ANALYZING_STARTED,
        finishedStatus: JOB_STATUS.ANALYZING_FINISHED,
        jobName: 'analyze'
    }, async (job) => {
        const [reels, allPosts, allStories] = await Promise.all([
            db.query.reelsUrls.findMany({ where: eq(reelsUrls.jobId, job.id), with: { comments: true } }),
            db.query.posts.findMany({ where: eq(posts.jobId, job.id), with: { comments: true } }),
            db.select().from(stories).where(eq(stories.jobId, job.id))
        ]);

        const avatarPath = getAvatarPath(job.username, job.id);
        if (!fs.existsSync(avatarPath)) {
            console.warn(`[analyze] Avatar not found for ${job.username}. Setting hasBloggerFace=false for all content`);
            await markAllContentWithoutBloggerFace(job.id);
        } else {
            console.log(
                `[analyze] Face detection started for job ${job.id}: reels=${reels.length}, posts=${allPosts.length}, stories=${allStories.length}`
            );
            await detectReelsBloggerFace(avatarPath, reels);
            await detectPostsBloggerFace(avatarPath, allPosts);
            await detectStoriesBloggerFace(avatarPath, allStories);
            console.log(`[analyze] Face detection completed for job ${job.id}`);
        }

        const errors: string[] = [];

        // Analyze reels
        const reelErrors = await analyzeReels(reels, job.postPrompt);
        errors.push(...reelErrors);

        // Analyze posts
        const postErrors = await analyzePosts(allPosts, job.postPrompt);
        errors.push(...postErrors);

        // Analyze stories
        const storyErrors = await analyzeStories(allStories, job.postPrompt);
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
