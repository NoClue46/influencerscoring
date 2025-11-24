import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS } from '../constants.js';
import { askOpenai, askOpenaiText } from '../ask-openai.js';
import { selectFrames } from '../utils/selectFrames.js';
import fs from 'fs';
import path from 'path';

export const analyzeJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'framing_finished' }
    });

    if (!job) return;

    console.log(`[analyze] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'analyzing_started' }
        });

        const [reels, posts] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id } }),
            prisma.post.findMany({ where: { jobId: job.id } })
        ])

        const errors: string[] = [];

        // Analyze reels
        for (const reel of reels) {
            try {
                console.log(`[analyze] Processing reel ${reel.id}`);

                const framesDir = path.join(process.env.DATA_PATH!, job.username, reel.id, 'frames');

                const allFrames = fs.readdirSync(framesDir)
                    .filter(f => f.endsWith('.jpg'))
                    .sort()
                    .map(f => path.join(framesDir, f));

                const selectedFrames = selectFrames(allFrames, 10);
                const result = await askOpenai(selectedFrames, job.postPrompt);

                await prisma.reels.update({
                    where: { id: reel.id },
                    data: { analyzeRawText: result.text }
                });

                console.log(`[analyze] Completed reel ${reel.id}`);
            } catch (error) {
                const err = error as Error;
                console.error(`[analyze] Failed for reel ${reel.id}:`, err.message);
                errors.push(`Reel ${reel.id}: ${err.message}`);
            }
        }

        // Analyze posts
        for (const post of posts) {
            try {
                console.log(`[analyze] Processing post ${post.id}`);

                const imagePath = path.join(process.env.DATA_PATH!, job.username, post.id, "post.jpg");
                const result = await askOpenai([imagePath], job.postPrompt);

                await prisma.post.update({
                    where: { id: post.id },
                    data: { analyzeRawText: result.text }
                });

                console.log(`[analyze] Completed post ${post.id}`);
            } catch (error) {
                const err = error as Error;
                console.error(`[analyze] Failed for post ${post.id}:`, err.message);
                errors.push(`Post ${post.id}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            throw new Error(`Analysis completed with errors: ${errors.join('; ')}`);
        }

        // Check if full analysis is needed
        if (!job.allVideos) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'analyzing_finished' }
            });
            console.log(`[analyze] Completed successfully for job ${job.id}`);
            return;
        }

        // Perform full analysis aggregation
        console.log(`[analyze] Starting full analysis aggregation for job ${job.id}`);

        const [analyzedReels, analyzedPosts] = await Promise.all([
            prisma.reels.findMany({
                where: {
                    jobId: job.id,
                    analyzeRawText: { not: null }
                },
                orderBy: { id: 'asc' }
            }),
            prisma.post.findMany({
                where: {
                    jobId: job.id,
                    analyzeRawText: { not: null }
                },
                orderBy: { id: 'asc' }
            })
        ]);

        const allAnalyzed = [...analyzedReels, ...analyzedPosts];
        console.log(`[analyze] Found ${allAnalyzed.length} analyzed items (${analyzedReels.length} reels, ${analyzedPosts.length} posts)`);

        // Build aggregated prompt
        const itemsSection = allAnalyzed
            .map((item, idx) => `Post #${idx + 1}:\n${item.analyzeRawText}`)
            .join('\n\n');

        const aggregatedPrompt = `=== REELS/POSTS ANALYSIS (${allAnalyzed.length} items) ===

${itemsSection}

=== TASK ===
${job.bloggerPrompt || 'Analyze posts above'}`;

        const response = await askOpenaiText(aggregatedPrompt);

        if (!response.text) {
            throw new Error('Empty response from OpenAI in full analysis');
        }

        await prisma.job.update({
            where: { id: job.id },
            data: {
                analyzeRawText: response.text,
                status: 'completed'
            }
        });

        console.log(`[analyze] Completed full analysis for job ${job.id}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[analyze] Failed for job ${job.id}:`, err.message);
        if (job.attempts >= MAX_ATTEMPTS) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', reason: err.message }
            });
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'framing_finished', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});
