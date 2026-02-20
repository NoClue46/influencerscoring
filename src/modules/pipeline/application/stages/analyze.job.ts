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
        const resolvedAvatarPath = fs.existsSync(avatarPath) ? avatarPath : null;

        if (!resolvedAvatarPath) {
            console.warn(`[analyze] Avatar not found for ${job.username}. All items will get hasBloggerFace=false`);
        }

        console.log(
            `[analyze] Starting combined analysis for job ${job.id}: reels=${reels.length}, posts=${allPosts.length}, stories=${allStories.length}`
        );

        const errors: string[] = [];

        const reelErrors = await analyzeReels(reels, resolvedAvatarPath);
        errors.push(...reelErrors);

        const postErrors = await analyzePosts(allPosts, resolvedAvatarPath);
        errors.push(...postErrors);

        const storyErrors = await analyzeStories(allStories, resolvedAvatarPath);
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
