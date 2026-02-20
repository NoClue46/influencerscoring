import { html } from 'hono/html';
import type { Job } from '@/infra/db/types.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

export function renderJobsListPage(jobs: Job[]) {
    const jobsHtml = jobs.length > 0 ? jobs.map((job) => {
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

        let recommendation = '-';
        let recommendationTitle = '';
        if (job.redflag) {
            recommendation = '❌';
            recommendationTitle = job.redflag.replace(/_/g, ' ');
        } else if (job.status === JOB_STATUS.COMPLETED && job.score !== null) {
            if (job.score >= 60) {
                recommendation = '✅';
                recommendationTitle = 'Recommended';
            } else {
                recommendation = '⚠️';
                recommendationTitle = 'Low score';
            }
        }

        return html`
            <tr>
                <td><a href="/jobs/${job.id}">${job.username}</a></td>
                <td>
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        padding: 0.15rem 0.65rem;
                        border-radius: 999px;
                        font-weight: 600;
                        color: ${statusColor};
                        background: ${statusBackground};
                        text-transform: capitalize;
                        letter-spacing: 0.01em;
                    ">${job.status.replace(/_/g, ' ')}</span>
                </td>
                <td>${job.score ?? '-'}</td>
                <td title="${recommendationTitle}">${recommendation}</td>
            </tr>
        `;
    }) : html`<tr><td colspan="4" style="text-align: center;">No Jobs</td></tr>`;

    return html`
        <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
            <form action="/" method="post" x-data style="width: 100%; height: auto; margin: 0;">
                <h2>Create Job</h2>
                <input type="text" name="username" placeholder="cristiano" required />
                <button type="submit" @click="$el.setAttribute('aria-busy', 'true')">Create Job</button>
            </form>

            <h2 style="margin-top: 3rem;">All Jobs</h2>
            <figure>
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Status</th>
                            <th>Score</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobsHtml}
                    </tbody>
                </table>
            </figure>
        </div>
    `;
}
