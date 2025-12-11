import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS, NICKNAME_ANALYSIS_PROMPT } from '../constants.js';
import { askOpenai, askOpenaiText, askOpenaiWithWebSearch } from '../ask-openai.js';
import { selectFrames } from '../utils/select-frames.js';
import fs from 'fs';
import path from 'path';

export const analyzeJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'speech_to_text_finished' }
    });

    if (!job) return;

    console.log(`[analyze] Started for job ${JSON.stringify(job)}`);

    try {
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'analyzing_started' }
        });

        const [reels, posts, stories] = await Promise.all([
            prisma.reels.findMany({ where: { jobId: job.id } }),
            prisma.post.findMany({ where: { jobId: job.id } }),
            prisma.story.findMany({ where: { jobId: job.id } })
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
                const promptWithTranscription = reel.transcription
                    ? `${job.postPrompt}\n\nTranscription:\n${reel.transcription}`
                    : job.postPrompt;
                const result = await askOpenai(selectedFrames, promptWithTranscription);

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

        // Analyze video stories
        const videoStories = stories.filter(s => s.isVideo);
        for (const story of videoStories) {
            try {
                console.log(`[analyze] Processing video story ${story.id}`);

                const framesDir = path.join(process.env.DATA_PATH!, job.username, story.id, 'frames');

                const allFrames = fs.readdirSync(framesDir)
                    .filter(f => f.endsWith('.jpg'))
                    .sort()
                    .map(f => path.join(framesDir, f));

                const selectedFrames = selectFrames(allFrames, 10);
                const promptWithTranscription = story.transcription
                    ? `${job.postPrompt}\n\nTranscription:\n${story.transcription}`
                    : job.postPrompt;
                const result = await askOpenai(selectedFrames, promptWithTranscription);

                await prisma.story.update({
                    where: { id: story.id },
                    data: { analyzeRawText: result.text }
                });

                console.log(`[analyze] Completed video story ${story.id}`);
            } catch (error) {
                const err = error as Error;
                console.error(`[analyze] Failed for video story ${story.id}:`, err.message);
                errors.push(`Video story ${story.id}: ${err.message}`);
            }
        }

        // Analyze image stories
        const imageStories = stories.filter(s => !s.isVideo);
        for (const story of imageStories) {
            try {
                console.log(`[analyze] Processing image story ${story.id}`);

                const imagePath = path.join(process.env.DATA_PATH!, job.username, story.id, 'story.jpg');
                const result = await askOpenai([imagePath], job.postPrompt);

                await prisma.story.update({
                    where: { id: story.id },
                    data: { analyzeRawText: result.text }
                });

                console.log(`[analyze] Completed image story ${story.id}`);
            } catch (error) {
                const err = error as Error;
                console.error(`[analyze] Failed for image story ${story.id}:`, err.message);
                errors.push(`Image story ${story.id}: ${err.message}`);
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

        const [analyzedReels, analyzedPosts, analyzedStories] = await Promise.all([
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
            }),
            prisma.story.findMany({
                where: {
                    jobId: job.id,
                    analyzeRawText: { not: null }
                },
                orderBy: { id: 'asc' }
            })
        ]);

        const allAnalyzed = [...analyzedReels, ...analyzedPosts, ...analyzedStories];
        console.log(`[analyze] Found ${allAnalyzed.length} analyzed items (${analyzedReels.length} reels, ${analyzedPosts.length} posts, ${analyzedStories.length} stories)`);

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

        // Nickname analysis via web search
        console.log(`[analyze] Starting nickname analysis for job ${job.id}`);
        const nicknamePrompt = NICKNAME_ANALYSIS_PROMPT(job.username);
        const nicknameResult = await askOpenaiWithWebSearch(nicknamePrompt);

        await prisma.job.update({
            where: { id: job.id },
            data: {
                analyzeRawText: response.text,
                nicknameAnalyseRawText: nicknameResult.text,
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
                data: { status: 'speech_to_text_finished', reason: err.message, attempts: { increment: 1 } }
            });
        }
    }
});
