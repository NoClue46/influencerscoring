import { html } from 'hono/html';
import type { Job, Reels, Post, Story, Comment } from '@/db/types.js';
import { JOB_STATUS } from '@/shared/job-status.js';

function snakeToTitle(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function scoreColor(param: string, score: number): string {
    if (param === 'frequency_of_advertising') {
        return score < 95 ? '#198754' : '#dc3545';
    }
    return score >= 60 ? '#198754' : '#dc3545';
}

function renderAnalyzeTable(rawText: string, avgCommentEr: number | null = null, avgFakenessScore: number | null = null) {
    try {
        const data = JSON.parse(rawText);
        if (typeof data !== 'object' || data === null) throw new Error('not object');
        const keys = Object.keys(data).filter(k => data[k] && typeof data[k] === 'object' && 'Score' in data[k]);
        if (keys.length === 0) throw new Error('no metrics');
        return html`
            <div style="overflow-x: auto;">
                <table style="margin-bottom: 1rem;">
                    <thead><tr><th></th>${keys.map(k => html`<th>${snakeToTitle(k)}</th>`)}${avgCommentEr !== null ? html`<th>Avg Comment ER</th>` : ''}${avgFakenessScore !== null ? html`<th>Avg Fakeness</th>` : ''}</tr></thead>
                    <tbody>
                        <tr><td><strong>Score</strong></td>${keys.map(k => html`<td style="color: ${scoreColor(k, data[k].Score)}; font-weight: 600;">${data[k].Score}</td>`)}${avgCommentEr !== null ? html`<td style="font-weight: 600;">${avgCommentEr.toFixed(2)}%</td>` : ''}${avgFakenessScore !== null ? html`<td style="font-weight: 600;">${avgFakenessScore.toFixed(1)}</td>` : ''}</tr>
                        <tr><td><strong>Confidence</strong></td>${keys.map(k => html`<td>${data[k].Confidence ?? '-'}</td>`)}${avgCommentEr !== null ? html`<td>-</td>` : ''}${avgFakenessScore !== null ? html`<td>-</td>` : ''}</tr>
                    </tbody>
                </table>
            </div>
            ${data.overall_summary ? html`<p><strong>Summary:</strong> ${data.overall_summary}</p>` : ''}
            <details style="margin-top: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: 4px; padding: 0;">
                <summary style="cursor: pointer; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--pico-muted-color); font-weight: 500;">Raw JSON</summary>
                <pre style="white-space: pre-wrap; margin: 0; padding: 0.75rem; border-top: 1px solid var(--pico-muted-border-color); font-size: 0.8rem; max-height: 400px; overflow-y: auto;">${rawText}</pre>
            </details>`;
    } catch {
        return html`<pre style="white-space: pre-wrap; margin: 0;">${rawText}</pre>`;
    }
}

const RISK_COLORS: Record<string, string> = { low: '#198754', medium: '#e67e22', high: '#dc3545' };

function renderNicknameTable(rawText: string) {
    try {
        const data = JSON.parse(rawText);
        if (typeof data !== 'object' || data === null) throw new Error('not object');
        const riskColor = RISK_COLORS[data.risk_level] ?? 'inherit';
        return html`
            <div style="overflow-x: auto;">
                <table style="margin-bottom: 1rem;">
                    <thead><tr><th>Reputation Score</th><th>Confidence</th><th>Estimated Age</th><th>Profession</th><th>Risk Level</th></tr></thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: 600;">${data.reputation_score ?? '-'}</td>
                            <td>${data.confidence ?? '-'}</td>
                            <td>${data.estimated_age ?? '-'}</td>
                            <td>${data.detected_profession ?? '-'}</td>
                            <td style="color: ${riskColor}; font-weight: 600;">${data.risk_level ?? '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            ${data.summary ? html`<p style="margin: 0 0 1rem;"><strong>Summary:</strong> ${data.summary}</p>` : ''}
            ${data.negative_findings?.length ? html`
                <h4 style="margin: 0.5rem 0;">Negative Findings</h4>
                <ul>${data.negative_findings.map((f: { issue: string; source?: string; severity?: string }) => html`<li><strong>${f.issue}</strong>${f.source ? ` — ${f.source}` : ''}${f.severity ? html` <span style="color: ${RISK_COLORS[f.severity] ?? 'inherit'};">(${f.severity})</span>` : ''}</li>`)}</ul>
            ` : ''}
            ${data.sources?.length ? html`
                <h4 style="margin: 0.5rem 0;">Sources</h4>
                <ul>${data.sources.map((s: string) => {
                    const m = s.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
                    return m ? html`<li><a href="${m[2]}" target="_blank">${m[1]}</a></li>` : html`<li>${s}</li>`;
                })}</ul>
            ` : ''}
            <details style="margin-top: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: 4px; padding: 0;">
                <summary style="cursor: pointer; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--pico-muted-color); font-weight: 500;">Raw JSON</summary>
                <pre style="white-space: pre-wrap; margin: 0; padding: 0.75rem; border-top: 1px solid var(--pico-muted-border-color); font-size: 0.8rem; max-height: 400px; overflow-y: auto;">${rawText}</pre>
            </details>`;
    } catch {
        return html`<pre style="white-space: pre-wrap; margin: 0;">${rawText}</pre>`;
    }
}

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
            <td colspan="2" style="${reel.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}">
                <details>
                    <summary style="cursor: pointer; display: flex; gap: 1rem; padding: 0.5rem 0;">
                        <span style="flex: 2;"><a href="${reel.reelsUrl}" target="_blank" onclick="event.stopPropagation();">${reel.reelsUrl}</a></span>
                        <span style="flex: 1;">${reel.reason ?? '-'}</span>
                    </summary>
                    <div style="padding: 1rem; background: var(--pico-card-background-color); margin-top: 0.5rem; border-radius: 4px;">
                        ${reel.commentEr !== null && reel.commentEr !== undefined && !Number.isNaN(reel.commentEr) ? html`
                            <p style="margin: 0 0 0.75rem;"><b>Comment ER:</b> ${reel.commentEr.toFixed(2)}%</p>
                        ` : ''}
                        ${reel.analyzeRawText ? html`
                            <h4 style="margin-top: 0;">Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${reel.analyzeRawText}</pre>
                        ` : ''}
                        ${reel.commentsAnalysisRawText ? html`
                            <h4>Comments Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${reel.commentsAnalysisRawText}</pre>
                        ` : ''}
                        <h4>Comments (${reel.comments.length})</h4>
                        ${reel.comments.length > 0 ? reel.comments.map((c) => html`
                            <article style="margin-bottom: 0.5rem; padding: 0.5rem; border-left: 2px solid var(--pico-primary);">
                                <p style="margin: 0;"><b>Text:</b> ${c.text}</p>
                            </article>
                        `) : html`<p>No comments</p>`}
                    </div>
                </details>
            </td>
        </tr>
    `) : html`<tr><td colspan="2" style="text-align: center;">No reels yet</td></tr>`;

    const postsHtml = job.posts.length > 0 ? job.posts.map((post) => html`
        <tr>
            <td colspan="2" style="${post.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}">
                <details>
                    <summary style="cursor: pointer; display: flex; gap: 1rem; padding: 0.5rem 0;">
                        <span style="flex: 2;"><a href="${post.postUrl}" target="_blank" onclick="event.stopPropagation();">${post.postUrl}</a></span>
                        <span style="flex: 1;">${post.reason ?? '-'}</span>
                    </summary>
                    <div style="padding: 1rem; background: var(--pico-card-background-color); margin-top: 0.5rem; border-radius: 4px;">
                        ${post.commentEr !== null && post.commentEr !== undefined && !Number.isNaN(post.commentEr) ? html`
                            <p style="margin: 0 0 0.75rem;"><b>Comment ER:</b> ${post.commentEr.toFixed(2)}%</p>
                        ` : ''}
                        ${post.analyzeRawText ? html`
                            <h4 style="margin-top: 0;">Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${post.analyzeRawText}</pre>
                        ` : ''}
                        ${post.commentsAnalysisRawText ? html`
                            <h4>Comments Analysis</h4>
                            <pre style="white-space: pre-wrap; margin-bottom: 1rem;">${post.commentsAnalysisRawText}</pre>
                        ` : ''}
                        <h4>Comments (${post.comments.length})</h4>
                        ${post.comments.length > 0 ? post.comments.map((c) => html`
                            <article style="margin-bottom: 0.5rem; padding: 0.5rem; border-left: 2px solid var(--pico-primary);">
                                <p style="margin: 0;"><b>Text:</b> ${c.text}</p>
                            </article>
                        `) : html`<p>No comments</p>`}
                    </div>
                </details>
            </td>
        </tr>
    `) : html`<tr><td colspan="2" style="text-align: center;">No posts yet</td></tr>`;

    const highlights = job.stories.filter(s => s.source === 'highlights');
    const hikerStories = job.stories.filter(s => s.source === 'hikerapi');

    const highlightsHtml = highlights.length > 0 ? highlights.map((story) => html`
        <tr>
            <td style="${story.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}"><a href="${story.downloadUrl}" target="_blank">${story.storyId}</a></td>
            <td style="${story.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}">${story.reason ?? '-'}</td>
        </tr>
    `) : html`<tr><td colspan="2" style="text-align: center;">No highlights yet</td></tr>`;

    const hikerStoriesHtml = hikerStories.length > 0 ? hikerStories.map((story) => html`
        <tr>
            <td style="${story.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}"><a href="${story.downloadUrl}" target="_blank">${story.storyId}</a></td>
            <td style="${story.reason ? 'background: rgba(220, 53, 69, 0.08);' : ''}">${story.reason ?? '-'}</td>
        </tr>
    `) : html`<tr><td colspan="2" style="text-align: center;">No stories yet</td></tr>`;

    return html`
        <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
            <a href="/" role="button" style="width: auto; display: inline-block; margin-bottom: 1rem; padding: 0.5rem 0.5rem;">← Back</a>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <h1 style="margin: 0;">@${job.username}</h1>
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
                ${job.isFemale !== null && job.isFemale !== undefined ? html`<span style="
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    border-radius: 999px;
                    font-weight: 600;
                    color: ${job.isFemale ? '#d63384' : '#0d6efd'};
                    background: ${job.isFemale ? 'rgba(214, 51, 132, 0.12)' : 'rgba(13, 110, 253, 0.12)'};
                ">${job.isFemale ? '♀ Female' : '♂ Male'}</span>` : ''}
            </div>

            ${job.analyzeRawText ? html`
            <article>
                <header><strong>Analyze Result</strong></header>
                ${renderAnalyzeTable(job.analyzeRawText, job.avgCommentEr, job.avgFakenessScore)}
            </article>
            ` : ''}

            ${job.nicknameAnalyseRawText ? html`
            <article>
                <header><strong>Nickname Analysis</strong></header>
                ${renderNicknameTable(job.nicknameAnalyseRawText)}
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
                            <th colspan="2" style="padding: 0;">
                                <div style="display: flex; gap: 1rem; padding: 0.5rem var(--pico-spacing, 1rem);">
                                    <span style="flex: 2;">URL</span>
                                    <span style="flex: 1;">Skip Reason</span>
                                </div>
                            </th>
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
                            <th colspan="2" style="padding: 0;">
                                <div style="display: flex; gap: 1rem; padding: 0.5rem var(--pico-spacing, 1rem);">
                                    <span style="flex: 2;">URL</span>
                                    <span style="flex: 1;">Skip Reason</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${postsHtml}
                    </tbody>
                </table>
            </figure>

            <h2 style="margin-top: 2rem;">Highlights (${highlights.length})</h2>
            <figure>
                <table>
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Skip Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${highlightsHtml}
                    </tbody>
                </table>
            </figure>

            <h2 style="margin-top: 2rem;">Stories (${hikerStories.length})</h2>
            <figure>
                <table>
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Skip Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${hikerStoriesHtml}
                    </tbody>
                </table>
            </figure>

            <details style="margin-top: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: 4px; padding: 0;">
                <summary style="cursor: pointer; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--pico-muted-color); font-weight: 500;">Post Prompt</summary>
                <div style="padding: 0.75rem; border-top: 1px solid var(--pico-muted-border-color); font-size: 0.8rem; max-height: 400px; overflow-y: auto;">
                    <p style="margin: 0; white-space: pre-wrap;">${job.postPrompt}</p>
                    ${job.reason ? html`<p style="margin: 0.5rem 0 0;"><strong>Reason:</strong> <span style="color: #dc3545;">${job.reason}</span></p>` : ''}
                </div>
            </details>

            ${job.bloggerPrompt ? html`
            <details style="margin-top: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: 4px; padding: 0;">
                <summary style="cursor: pointer; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--pico-muted-color); font-weight: 500;">Blogger Prompt</summary>
                <div style="padding: 0.75rem; border-top: 1px solid var(--pico-muted-border-color); font-size: 0.8rem; max-height: 400px; overflow-y: auto;">
                    <p style="margin: 0; white-space: pre-wrap;">${job.bloggerPrompt}</p>
                </div>
            </details>
            ` : ''}
        </div>
    `;
}
