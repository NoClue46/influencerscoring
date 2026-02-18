import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_FILE_SIZE } from '../constants.js';
import { getItemPath } from '../utils/paths.js';
import { withRetry, chunk } from '../utils/helpers.js';
import { withJobTransition } from './with-job-transition.js';
import { downloadFile } from '../utils/download-file.js';

interface DownloadableItem {
    id: string;
    downloadUrl: string | null;
    filepath: string | null;
}

interface DownloadItemsConfig {
    label: string;
    getFilename: (item: DownloadableItem) => string;
    update: (id: string, data: { filepath?: string; reason?: string }) => Promise<unknown>;
}

async function downloadItems(
    items: DownloadableItem[],
    username: string,
    jobId: string,
    config: DownloadItemsConfig
) {
    const pending = items.filter(item => !item.filepath);
    const batches = chunk(pending, 5);

    for (const batch of batches) {
        await Promise.all(batch.map(async (item) => {
            if (!item.downloadUrl) {
                console.warn(`[download] Download url not found for ${config.label}: ${item.id}`);
                return;
            }

            const dest = getItemPath(username, jobId, item.id, config.getFilename(item));

            try {
                const result = await withRetry(() => downloadFile(item.downloadUrl!, dest, { maxSize: MAX_FILE_SIZE }), 3);
                await config.update(item.id, result.skipped ? { reason: result.reason } : { filepath: dest });
            } catch (error) {
                console.error(`[download] Failed to download ${config.label} ${item.id}: `, error);
                await config.update(item.id, { reason: 'Failed to download' });
            }
        }));
    }
}

export const downloadJob = new CronJob('*/5 * * * * *', () =>
    withJobTransition({
        fromStatus: 'fetching_finished',
        startedStatus: 'downloading_started',
        finishedStatus: 'downloading_finished',
        jobName: 'download'
    }, async (job) => {
        const [reels, posts, stories] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id } }),
            prisma.post.findMany({ where: { jobId: job.id } }),
            prisma.story.findMany({ where: { jobId: job.id } })
        ]);

        await downloadItems(reels, job.username, job.id, {
            label: 'reels',
            getFilename: () => 'reels.mp4',
            update: (id, data) => prisma.reels.update({ where: { id }, data })
        });

        await downloadItems(posts, job.username, job.id, {
            label: 'post',
            getFilename: () => 'post.jpg',
            update: (id, data) => prisma.post.update({ where: { id }, data })
        });

        await downloadItems(stories, job.username, job.id, {
            label: 'story',
            getFilename: (item) => {
                const story = stories.find(s => s.id === item.id)!;
                return `story.${story.isVideo ? 'mp4' : 'jpg'}`;
            },
            update: (id, data) => prisma.story.update({ where: { id }, data })
        });
    })
);
