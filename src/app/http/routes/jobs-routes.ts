import { html } from 'hono/html';
import type { Hono, Context } from 'hono';
import { db } from '@/infra/db/index.js';
import { jobs, reelsUrls, posts, stories } from '@/infra/db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { POST_ANALYSIS_PROMPT } from '@/modules/ai/prompts/post-analysis.prompt.js';
import { DEFAULT_BLOGGER_PROMPT } from '@/modules/ai/prompts/blogger-analysis.prompt.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';
import { layout } from '@/app/http/views/layout.js';
import { renderJobsListPage } from '@/app/http/views/jobs-list-page.js';
import {
    renderJobDetailsPage,
    renderJobNotFoundPage,
    type JobWithRelations,
} from '@/app/http/views/job-details-page.js';

export function registerJobsRoutes(app: Hono): void {
    app.post('/', async (c: Context) => {
        try {
            const body = await c.req.parseBody();

            let username = body.username as string;
            if (username.startsWith('@')) {
                username = username.substring(1);
            }

            await db.insert(jobs).values({
                username,
                postPrompt: POST_ANALYSIS_PROMPT,
                bloggerPrompt: DEFAULT_BLOGGER_PROMPT,
                allVideos: true,
                postNumber: 20,
                status: JOB_STATUS.PENDING,
            });

            return c.redirect('/');
        } catch (error) {
            console.error('Failed to create job:', error);
            return c.html(layout(html`<h1 style="color: red;">Internal server error!</h1>`));
        }
    });

    app.get('/', async (c: Context) => {
        const allJobs = await db.select().from(jobs).orderBy(desc(jobs.id));

        return c.html(layout(renderJobsListPage(allJobs)));
    });

    app.get('/jobs/:id', async (c: Context) => {
        const id = c.req.param('id');

        const job = await db.query.jobs.findFirst({
            where: eq(jobs.id, id),
            with: {
                reels: {
                    orderBy: asc(reelsUrls.id),
                    with: { comments: true }
                },
                posts: {
                    orderBy: asc(posts.id),
                    with: { comments: true }
                },
                stories: {
                    orderBy: asc(stories.id),
                },
            },
        });

        if (!job) {
            return c.html(layout(renderJobNotFoundPage(id)), 404);
        }

        return c.html(layout(renderJobDetailsPage(job as JobWithRelations)));
    });
}
