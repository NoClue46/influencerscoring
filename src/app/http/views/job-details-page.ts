import { html } from 'hono/html';
import type { Job, Reels, Post, Story, Comment } from '@/infra/db/types.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

export type JobWithRelations = Job & {
    reels: (Reels & { comments: Comment[] })[];
    posts: (Post & { comments: Comment[] })[];
    stories: Story[];
};

export function renderJobNotFoundPage(id: string) {
    return html`
        <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
            <h1>Job Not Found</h1>
            <p>The job with ID ${id} does not exist.</p>
            <a href="/" role="button">Back to Home</a>
        </div>
    `;
}

export function renderJobDetailsPage(job: JobWithRelations) {
    const statusColor = job.status === JOB_STATUS.FAILED
        ? '#dc3545'
        : job.status === JOB_STATUS.COMPLETED
            ? '#198754'
            : 'var(--pico-primary)';

    const statusBackground = job.status === JOB_STATUS.FAILED
        ? 'rgba(220, 53, 69, 0.12)'
        : job.status === JOB_STATUS.COMPLETED
            ? 'rgba(25, 135, 84, 0.12)'
            : 'rgba(0, 123, 255, 0.12)';

    const reelsHtml = job.reels.length > 0 ? job.reels.map((reel) => html`
        <tr>
            <td colspan="3">
                <details>
                    <summary style="cursor: pointer; display: flex; gap: 1rem; padding: 0.5rem 0;">
                        <span style="flex: 2;"><a href="${reel.reelsUrl}" target="_blank" onclick="event.stopPropagation();">${reel.reelsUrl}</a></span>
                        <span style="flex: 1;">${reel.reason ?? '-'}</span>
                    </summary>
                    <div style="padding: 1rem; background: var(--pico-card-background-color); margin-top: 0.5rem; border-radius: 4px;">
                        ${reel.commentEr !== null && reel.commentEr !== undefined && !Number.isNaN(reel.commentEr) ? html`
                            <p style="margin: 0 0 0.75rem;"><b>Comment ER:</b> ${(reel.commentEr * 100).toFixed(2)}%</p>
                        ` : ''}
                        ${reel.analyzeRawText ? html`
                            <h4 style="margin-top: 0;">Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${reel.analyzeRawText}</pre>
                        ` : ''}
                        <h4>Comments (${reel.comments.length})</h4>
                        ${reel.comments.length > 0 ? reel.comments.map((c) => html`
                            <article style="margin-bottom: 0.5rem; padding: 0.5rem; border-left: 2px solid var(--pico-primary);">
                                <p style="margin: 0;"><b>Text:</b> ${c.text}</p>
                                ${c.analyseRawText ? html`<p style="margin: 0.25rem 0 0;"><b>Analysis:</b> ${c.analyseRawText}</p>` : ''}
                            </article>
                        `) : html`<p>No comments</p>`}
                    </div>
                </details>
            </td>
        </tr>
    `) : html`<tr><td colspan="3" style="text-align: center;">No reels yet</td></tr>`;

    const postsHtml = job.posts.length > 0 ? job.posts.map((post) => html`
        <tr>
            <td colspan="3">
                <details>
                    <summary style="cursor: pointer; display: flex; gap: 1rem; padding: 0.5rem 0;">
                        <span style="flex: 2;"><a href="${post.postUrl}" target="_blank" onclick="event.stopPropagation();">${post.postUrl}</a></span>
                        <span style="flex: 1;">${post.reason ?? '-'}</span>
                    </summary>
                    <div style="padding: 1rem; background: var(--pico-card-background-color); margin-top: 0.5rem; border-radius: 4px;">
                        ${post.commentEr !== null && post.commentEr !== undefined && !Number.isNaN(post.commentEr) ? html`
                            <p style="margin: 0 0 0.75rem;"><b>Comment ER:</b> ${(post.commentEr * 100).toFixed(2)}%</p>
                        ` : ''}
                        ${post.analyzeRawText ? html`
                            <h4 style="margin-top: 0;">Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${post.analyzeRawText}</pre>
                        ` : ''}
                        <h4>Comments (${post.comments.length})</h4>
                        ${post.comments.length > 0 ? post.comments.map((c) => html`
                            <article style="margin-bottom: 0.5rem; padding: 0.5rem; border-left: 2px solid var(--pico-primary);">
                                <p style="margin: 0;"><b>Text:</b> ${c.text}</p>
                                ${c.analyseRawText ? html`<p style="margin: 0.25rem 0 0;"><b>Analysis:</b> ${c.analyseRawText}</p>` : ''}
                            </article>
                        `) : html`<p>No comments</p>`}
                    </div>
                </details>
            </td>
        </tr>
    `) : html`<tr><td colspan="3" style="text-align: center;">No posts yet</td></tr>`;

    const storiesHtml = job.stories.length > 0 ? job.stories.map((story) => html`
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

    return html`
        <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
            <a href="/" role="button" style="width: auto; display: inline-block; margin-bottom: 1rem; padding: 0.5rem 0.5rem;">← Back</a>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <h1 style="margin: 0;">Job: @${job.username}</h1>
                <span style="font-size: 1rem; color: var(--pico-muted-color);">${job.followers.toLocaleString()} followers</span>
                <span style="
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-weight: 600;
                    color: ${statusColor};
                    background: ${statusBackground};
                    text-transform: capitalize;
                    letter-spacing: 0.01em;
                ">${job.status.replace(/_/g, ' ')}</span>
                ${job.redflag ? html`<span style="
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-weight: 600;
                    color: #dc3545;
                    background: rgba(220, 53, 69, 0.12);
                ">❌ ${job.redflag.replace(/_/g, ' ')}</span>` : ''}
                ${job.isPrivate ? html`<span style="
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-weight: 600;
                    color: #6b7280;
                    background: rgba(107, 114, 128, 0.12);
                ">🔒 Private Account</span>` : ''}
            </div>

            ${job.analyzeRawText ? html`
            <article>
                <header><strong>Analyze Result</strong></header>
                <pre style="white-space: pre-wrap; margin: 0;">${job.analyzeRawText}</pre>
            </article>
            ` : ''}

            ${job.nicknameAnalyseRawText ? html`
            <article>
                <header><strong>Nickname Analysis</strong></header>
                <pre style="white-space: pre-wrap; margin: 0;">${job.nicknameAnalyseRawText}</pre>
            </article>
            ` : ''}

            ${job.avgIncomeLevel !== null ? html`
            <article>
                <header><strong>Photo Analysis</strong></header>
                <p style="margin: 0;">Avg Income Level: <strong>${job.avgIncomeLevel?.toFixed(1) ?? 'N/A'}</strong></p>
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
        </div>
    `;
}
