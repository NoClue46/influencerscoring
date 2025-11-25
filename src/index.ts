import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { html } from "hono/html";
import { prisma } from "./prisma.js";
import { startCronJobs, stopCronJobs } from "./jobs/index.js";
import type { Context } from 'hono';

const app = new Hono();

const layout = (children: ReturnType<typeof html>) => html`
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>App</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
        <meta name="color-scheme" content="light dark" />
        <style>
            body {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
        </style>
        <script src="//unpkg.com/alpinejs" defer></script>
    </head>
    <body>
    ${children}
    </body>
    </html>
`;

app.post("/", async (c: Context) => {
    try {
        const body = await c.req.parseBody();

        let username = body.username as string;
        if (username.startsWith('@')) {
            username = username.substring(1);
        }

        await prisma.job.create({
            data: {
                username: username,
                postPrompt: body.prompt as string,
                bloggerPrompt: body.bloggerPrompt as string | undefined,
                allVideos: body.allVideos === 'on',
                postNumber: parseInt(body.postNumber as string) || 10,
                status: 'pending'
            }
        });

        return c.redirect('/');
    } catch (error) {
        console.error("Failed to create job:", error);
        return c.html(layout(html`<h1 style="color: red;">Internal server error!</h1>`))
    }
})

app.get("/", async (c: Context) => {
    const jobs = await prisma.job.findMany({});

    const jobsHtml = jobs.length > 0 ? jobs.map(job => {
        return html`
            <tr>
                <td><a href="/jobs/${job.id}">${job.username}</a></td>
            </tr>
        `;
    }) : html`<tr><td colspan="3" style="text-align: center;">No Jobs</td></tr>`;

    return c.html(
        layout(
            html`
                <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                    <form action="/" method="post" x-data style="width: 100%; height: auto; margin: 0;">
                        <h2>Create Job</h2>
                        <input type="text" name="username" placeholder="cristiano" required />
                        <label>
                            <input type="checkbox" name="allVideos" />
                            Analyze entire profile
                        </label>
                        <label>
                            Posts count
                            <select name="postNumber">
                                <option value="10">10</option>
                                <option value="15">15</option>
                                <option value="20">20</option>
                            </select>
                        </label>
                        <label>
                            Post Prompt
                            <textarea name="prompt" required placeholder="Enter post prompt..." rows="4"></textarea>
                        </label>
                        <label>
                            Blogger Prompt
                            <textarea name="bloggerPrompt" placeholder="Enter blogger prompt..." rows="4"></textarea>
                        </label>
                        <button type="submit" @click="$el.setAttribute('aria-busy', 'true')">Create Job</button>
                    </form>

                    <h2 style="margin-top: 3rem;">All Jobs</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${jobsHtml}
                            </tbody>
                        </table>
                    </figure>
                </div>
            `
        )
    )
})

app.get("/jobs/:id", async (c: Context) => {
    const id = c.req.param('id');

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            reels: { orderBy: { id: 'asc' } },
            posts: { orderBy: { id: 'asc' } },
            stories: { orderBy: { id: 'asc' } },
        }
    });

    if (!job) {
        return c.html(layout(html`
            <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                <h1>Job Not Found</h1>
                <p>The job with ID ${id} does not exist.</p>
                <a href="/" role="button">Back to Home</a>
            </div>
        `), 404);
    }

    const reelsHtml = job.reels.length > 0 ? job.reels.map(reel => html`
        <tr>
            <td><a href="${reel.reelsUrl}" target="_blank">${reel.reelsUrl}</a></td>
            <td>${reel.reason ?? '-'}</td>
            <td>${reel.analyzeRawText ? html`
                <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="document.getElementById('modal-${reel.id}').showModal()">Show</button>
                <dialog id="modal-${reel.id}" style="max-width: 600px; padding: 1.5rem; border-radius: 8px;">
                    <pre style="white-space: pre-wrap; margin: 0 0 1rem;">${reel.analyzeRawText}</pre>
                    <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="this.closest('dialog').close()">Close</button>
                </dialog>
            ` : '-'}</td>
        </tr>
    `) : html`<tr><td colspan="4" style="text-align: center;">No reels yet</td></tr>`;

    const postsHtml = job.posts.length > 0 ? job.posts.map(post => html`
        <tr>
            <td><a href="${post.postUrl}" target="_blank">${post.postUrl}</a></td>
            <td>${post.reason ?? '-'}</td>
            <td>${post.analyzeRawText ? html`
                <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="document.getElementById('modal-post-${post.id}').showModal()">Show</button>
                <dialog id="modal-post-${post.id}" style="max-width: 600px; padding: 1.5rem; border-radius: 8px;">
                    <pre style="white-space: pre-wrap; margin: 0 0 1rem;">${post.analyzeRawText}</pre>
                    <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="this.closest('dialog').close()">Close</button>
                </dialog>
            ` : '-'}</td>
        </tr>
    `) : html`<tr><td colspan="4" style="text-align: center;">No posts yet</td></tr>`;

    const storiesHtml = job.stories.length > 0 ? job.stories.map(story => html`
        <tr>
            <td><a href="${story.downloadUrl}" target="_blank">${story.storyId}</a></td>
            <td>${story.reason ?? '-'}</td>
            <td>${story.analyzeRawText ? html`
                <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="document.getElementById('modal-story-${story.id}').showModal()">Show</button>
                <dialog id="modal-story-${story.id}" style="max-width: 600px; padding: 1.5rem; border-radius: 8px;">
                    <pre style="white-space: pre-wrap; margin: 0 0 1rem;">${story.analyzeRawText}</pre>
                    <button style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="this.closest('dialog').close()">Close</button>
                </dialog>
            ` : '-'}</td>
        </tr>
    `) : html`<tr><td colspan="4" style="text-align: center;">No stories yet</td></tr>`;

    return c.html(
        layout(
            html`
                <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                    <a href="/" role="button" style="width: auto; display: inline-block; margin-bottom: 1rem; padding: 0.5rem 0.5rem;">← Back</a>

                    <h1>Job: @${job.username}</h1>

                    <article>
                        <header><strong>Post Prompt</strong></header>
                        <div>
                            <p>${job.postPrompt}</p>
                        </div>
                        <table>
                            <tbody>
                                ${job.reason ? html`
                                <tr>
                                    <td><strong>Reason</strong></td>
                                    <td style="color: #dc3545;">${job.reason}</td>
                                </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </article>

                    ${job.bloggerPrompt ? html`
                    <article>
                        <header><strong>Blogger Prompt</strong></header>
                        <p>${job.bloggerPrompt}</p>
                    </article>
                    ` : ''}

                    ${job.analyzeRawText ? html`
                    <article>
                        <header><strong>Analyze Result</strong></header>
                        <button onclick="document.getElementById('modal-job-analyze').showModal()">Show</button>
                        <dialog id="modal-job-analyze">
                            <pre>${job.analyzeRawText}</pre>
                            <button onclick="this.closest('dialog').close()">Close</button>
                        </dialog>
                    </article>
                    ` : ''}

                    <h2 style="margin-top: 2rem;">Reels (${job.reels.length})</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Skip Reason</th>
                                    <th>Analysis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reelsHtml}
                            </tbody>
                        </table>
                    </figure>

                    <h2 style="margin-top: 2rem;">Posts (${job.posts.length})</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Skip Reason</th>
                                    <th>Analysis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${postsHtml}
                            </tbody>
                        </table>
                    </figure>

                    <h2 style="margin-top: 2rem;">Stories (${job.stories.length})</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Skip Reason</th>
                                    <th>Analysis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${storiesHtml}
                            </tbody>
                        </table>
                    </figure>
                </div>
            `
        )
    );
})

const server = serve(app)

startCronJobs();

process.on('SIGINT', () => {
    stopCronJobs();
    server.close()
    process.exit(0)
})
process.on('SIGTERM', () => {
    stopCronJobs();
    server.close((err?: Error) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        process.exit(0)
    })
})
