import 'dotenv/config';
import {Hono} from 'hono';
import {serve} from '@hono/node-server';
import {html} from "hono/html";
import {fetchReelsWithUrls} from "./scrape-creators.js";
import {downloadAllVideos, processVideosToFrames} from "./replicate.js";
import {processFramesWithOpenAI} from "./ask-openai.js";
import {downloadFramesToDisk} from "./download-frames.js";
import {prisma} from "./prisma.js";
import {startCronJobs, stopCronJobs} from "./jobs/index.js";

const app = new Hono();

const layout = (children) => html`
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

app.post("/", async (c) => {
    try {
        const body = await c.req.parseBody();

        let username = body.username;
        if (username.startsWith('@')) {
            username = username.substring(1);
        }

        await prisma.job.create({
            data: {
                username: username,
                prompt: body.prompt,
                allVideos: body.allVideos === 'on',
                status: 'pending'
            }
        });

        return c.redirect('/');
    } catch (error) {
        console.error("Failed to create job:", error);
        return c.html(layout(html`<h1 style="color: red;">Internal server error!</h1>`))
    }
})

app.get("/", async (c) => {
    const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' }
    });

    const jobsHtml = jobs.length > 0 ? jobs.map(job => {
        const createdDate = new Date(job.createdAt).toLocaleString('en-US');
        const progress = `${job.processedVideos}/${job.totalVideos}`;

        return html`
            <tr>
                <td><a href="/jobs/${job.id}">${job.username}</a></td>
                <td>${job.status}</td>
                <td>${progress}</td>
                <td>${createdDate}</td>
            </tr>
        `;
    }).join('') : html`<tr><td colspan="4" style="text-align: center;">No Jobs</td></tr>`;

    return c.html(
        layout(
            html`
                <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                    <form action="/" method="post" x-data style="width: 100%; height: auto; margin: 0;">
                        <h2>Create Job</h2>
                        <input type="text" name="username" placeholder="cristiano" required />
                        <label>
                            <input type="checkbox" name="allVideos" />
                            All videos
                        </label>
                        <textarea name="prompt" required placeholder="Enter prompt..." rows="4"></textarea>
                        <button type="submit" @click="$el.setAttribute('aria-busy', 'true')">Create Job</button>
                    </form>

                    <h2 style="margin-top: 3rem;">All Jobs</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${html([jobsHtml])}
                            </tbody>
                        </table>
                    </figure>
                </div>
            `
        )
    )
})

app.get("/jobs/:id", async (c) => {
    const id = c.req.param('id');

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            reels: { orderBy: { id: 'asc' } },
            analysisResults: { orderBy: { createdAt: 'desc' } }
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

    const statusColor = {
        'pending': '#6c757d',
        'fetching_reels': '#0dcaf0',
        'downloading_videos': '#0d6efd',
        'extracting_frames': '#6f42c1',
        'analyzing': '#fd7e14',
        'completed': '#198754',
        'failed': '#dc3545'
    }[job.status] || '#6c757d';

    const reelsHtml = job.reels.length > 0 ? job.reels.map(reel => html`
        <tr>
            <td><a href="${reel.url}" target="_blank">${reel.url}</a></td>
            <td>${reel.status}</td>
            <td>${reel.reason || '-'}</td>
        </tr>
    `).join('') : html`<tr><td colspan="3" style="text-align: center;">No reels yet</td></tr>`;

    const analysisHtml = job.analysisResults.length > 0 ? job.analysisResults.map(result => html`
        <article style="margin-bottom: 1rem;">
            <header><strong>Analysis - ${new Date(result.createdAt).toLocaleString('en-US')}</strong></header>
            <pre style="white-space: pre-wrap; word-wrap: break-word;">${result.rawText}</pre>
        </article>
    `).join('') : html`<p><em>No analysis results yet</em></p>`;

    return c.html(
        layout(
            html`
                <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                    <a href="/" role="button" style="width: auto; display: inline-block; margin-bottom: 1rem;">← Back</a>

                    <h1>Job: @${job.username}</h1>

                    <article>
                        <header><strong>Job Details</strong></header>
                        <table>
                            <tbody>
                                <tr>
                                    <td><strong>Status</strong></td>
                                    <td><span style="color: ${statusColor}; font-weight: bold;">${job.status}</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Progress</strong></td>
                                    <td>${job.processedVideos}/${job.totalVideos} videos</td>
                                </tr>
                                <tr>
                                    <td><strong>All Videos</strong></td>
                                    <td>${job.allVideos ? 'Yes' : 'No'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Created</strong></td>
                                    <td>${new Date(job.createdAt).toLocaleString('en-US')}</td>
                                </tr>
                                ${job.startedAt ? html`
                                <tr>
                                    <td><strong>Started</strong></td>
                                    <td>${new Date(job.startedAt).toLocaleString('en-US')}</td>
                                </tr>
                                ` : ''}
                                ${job.completedAt ? html`
                                <tr>
                                    <td><strong>Completed</strong></td>
                                    <td>${new Date(job.completedAt).toLocaleString('en-US')}</td>
                                </tr>
                                ` : ''}
                                ${job.reason ? html`
                                <tr>
                                    <td><strong>Reason</strong></td>
                                    <td style="color: #dc3545;">${job.reason}</td>
                                </tr>
                                ` : ''}
                            </tbody>
                        </table>
                        <div>
                            <strong>Prompt</strong>
                            <p>${job.prompt}</p>
                        </div>
                    </article>

                    <h2 style="margin-top: 2rem;">Reels (${job.reels.length})</h2>
                    <figure>
                        <table>
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Status</th>
                                    <th>Skip Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${html([reelsHtml])}
                            </tbody>
                        </table>
                    </figure>

                    <h2 style="margin-top: 2rem;">Analysis Results</h2>
                    ${html([analysisHtml])}
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
    server.close((err) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        process.exit(0)
    })
})