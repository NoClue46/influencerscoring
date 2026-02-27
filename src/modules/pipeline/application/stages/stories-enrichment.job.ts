import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { jobs, stories } from '@/infra/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { fetchStoriesFromHikerApi } from '@/modules/instagram/infra/hiker-api/fetch-stories.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

const MIN_STORIES = 20;

export const storiesEnrichmentJob = new CronJob('0 */30 * * * *', async () => {
    const jobsWithFewStories = await db
        .select({
            id: jobs.id,
            username: jobs.username,
            storyCount: sql<number>`count(${stories.id})`.as('story_count'),
        })
        .from(jobs)
        .leftJoin(stories, eq(stories.jobId, jobs.id))
        .where(eq(jobs.status, JOB_STATUS.COMPLETED))
        .groupBy(jobs.id)
        .having(sql`count(${stories.id}) < ${MIN_STORIES}`);

    if (jobsWithFewStories.length === 0) return;

    console.log(`[stories-enrichment] Found ${jobsWithFewStories.length} jobs with < ${MIN_STORIES} stories`);

    for (const job of jobsWithFewStories) {
        try {
            const newStories = await fetchStoriesFromHikerApi(job.username);

            if (newStories.length === 0) {
                console.log(`[stories-enrichment] No stories from HikerAPI for ${job.username}`);
                continue;
            }

            const existingStoryIds = (await db
                .select({ storyId: stories.storyId })
                .from(stories)
                .where(eq(stories.jobId, job.id))
            ).map(s => s.storyId);

            const uniqueStories = newStories.filter(s => !existingStoryIds.includes(s.id));

            if (uniqueStories.length === 0) {
                console.log(`[stories-enrichment] No new stories for ${job.username} (all ${newStories.length} already exist)`);
                continue;
            }

            await db.insert(stories).values(
                uniqueStories.map(s => ({
                    storyId: s.id,
                    downloadUrl: s.downloadUrl,
                    isVideo: s.isVideo,
                    jobId: job.id,
                }))
            );

            await db.update(jobs).set({
                status: JOB_STATUS.FETCHING_FINISHED,
                attempts: 0,
            }).where(eq(jobs.id, job.id));

            console.log(`[stories-enrichment] Added ${uniqueStories.length} stories for ${job.username}, reset to fetching_finished`);
        } catch (error) {
            console.error(`[stories-enrichment] Failed for ${job.username}:`, error);
        }
    }
});
