import { CronJob } from 'cron';
import { db } from '@/infra/db/index.js';
import { jobs, stories } from '@/infra/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { fetchStoriesFromHikerApi } from '@/modules/instagram/infra/hiker-api/fetch-stories.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';
import { STORY_SOURCE } from '@/shared/types/story-source.js';

const MIN_HIKERAPI_STORIES = 20;

export const storiesEnrichmentJob = new CronJob('0 */30 * * * *', async () => {
    const completedJobs = await db
        .select({
            id: jobs.id,
            username: jobs.username,
        })
        .from(jobs)
        .where(and(
            eq(jobs.status, JOB_STATUS.COMPLETED),
            eq(jobs.storiesEnriched, false),
        ));

    if (completedJobs.length === 0) return;

    console.log(`[stories-enrichment] Found ${completedJobs.length} jobs to enrich`);

    for (const job of completedJobs) {
        try {
            // Single query: get all storyIds + source for dedup and count
            const existingStories = await db
                .select({ storyId: stories.storyId, source: stories.source })
                .from(stories)
                .where(eq(stories.jobId, job.id));

            const existingStoryIds = new Set(existingStories.map(s => s.storyId));
            const hikerapiCount = existingStories.filter(s => s.source === STORY_SOURCE.HIKERAPI).length;

            if (hikerapiCount >= MIN_HIKERAPI_STORIES) {
                await db.update(jobs).set({ storiesEnriched: true }).where(eq(jobs.id, job.id));
                console.log(`[stories-enrichment] ${job.username}: already has ${hikerapiCount} hikerapi stories, marking enriched`);
                continue;
            }

            const newStories = await fetchStoriesFromHikerApi(job.username, MIN_HIKERAPI_STORIES);

            if (newStories.length === 0) {
                console.log(`[stories-enrichment] No stories from HikerAPI for ${job.username}`);
                continue;
            }

            const uniqueStories = newStories.filter(s => !existingStoryIds.has(s.id));

            if (uniqueStories.length > 0) {
                await db.insert(stories).values(
                    uniqueStories.map(s => ({
                        storyId: s.id,
                        downloadUrl: s.downloadUrl,
                        isVideo: s.isVideo,
                        jobId: job.id,
                        source: STORY_SOURCE.HIKERAPI,
                    }))
                );
            }

            const totalHikerapi = hikerapiCount + uniqueStories.length;
            console.log(`[stories-enrichment] ${job.username}: added ${uniqueStories.length} new hikerapi stories (total hikerapi: ${totalHikerapi}/${MIN_HIKERAPI_STORIES})`);

            if (totalHikerapi >= MIN_HIKERAPI_STORIES) {
                await db.update(jobs).set({
                    storiesEnriched: true,
                    status: JOB_STATUS.FETCHING_FINISHED,
                    attempts: 0,
                }).where(eq(jobs.id, job.id));

                console.log(`[stories-enrichment] ${job.username}: reached ${totalHikerapi} hikerapi stories, restarting pipeline`);
            }
        } catch (error) {
            console.error(`[stories-enrichment] Failed for ${job.username}:`, error);
        }
    }
});
