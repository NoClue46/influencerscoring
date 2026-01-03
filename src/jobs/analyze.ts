import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { MAX_ATTEMPTS, NICKNAME_ANALYSIS_PROMPT, COMMENT_ANALYSIS_PROMPT } from '../constants.js';
import { askOpenai, askOpenaiText, askOpenaiWithWebSearch } from '../ask-openai.js';
import { selectFrames } from '../utils/select-frames.js';
import fs from 'fs';
import path from 'path';

const SCORING_WEIGHTS: Record<string, number> = {
    structured_thinking: 10,
    knowledge_depth: 10,
    intelligence: 10,
    personal_values: 30,
    enthusiasm: 10,
    charisma: 30
};

function calculateScore(analysisJson: string): number | null {
    try {
        const data = JSON.parse(analysisJson);
        let sum = 0;
        for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
            sum += (data[key]?.Score || 0) * weight;
        }
        return sum / 100;
    } catch {
        return null;
    }
}

function validateBloggerMetrics(analysisJson: string): string | null {
    try {
        const data = JSON.parse(analysisJson);
        const requiredMetrics = [
            'income_level',
            'talking_head',
            'beauty_alignment',
            'low_end_ads_absence',
            'pillow_ads_constraint',
            'ads_focus_consistency',
            'sales_authenticity',
            'frequency_of_advertising'
        ];

        const failedMetrics: string[] = [];

        for (const metric of requiredMetrics) {
            const score = data[metric]?.Score;
            if (score !== undefined && score < 60) {
                failedMetrics.push(metric);
            }
        }

        return failedMetrics.length > 0
            ? `Low scores: ${failedMetrics.join(', ')}`
            : null;
    } catch {
        return null; // Don't fail job on parse errors
    }
}

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
            prisma.reels.findMany({ where: { jobId: job.id }, include: { comments: true } }),
            prisma.post.findMany({ where: { jobId: job.id }, include: { comments: true } }),
            prisma.story.findMany({ where: { jobId: job.id } })
        ])

        const errors: string[] = [];

        // Analyze reels
        for (const reel of reels) {
            if (!reel.filepath) {
                console.log(`[analyze] Skipping reel ${reel.id} - not downloaded`);
                continue;
            }

            try {
                console.log(`[analyze] Processing reel ${reel.id}`);

                const framesDir = path.join(path.dirname(reel.filepath), 'frames');

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

                // Analyze reel comments
                for (const comment of reel.comments) {
                    try {
                        console.log(`[analyze] Processing comment ${comment.id} for reel ${reel.id}`);
                        const commentPrompt = `${COMMENT_ANALYSIS_PROMPT}\n\nКомментарий:\n${comment.text}`;
                        const commentResult = await askOpenaiText(commentPrompt);
                        await prisma.comment.update({
                            where: { id: comment.id },
                            data: { analyseRawText: commentResult.text }
                        });
                    } catch (error) {
                        const err = error as Error;
                        console.error(`[analyze] Failed for comment ${comment.id}:`, err.message);
                        errors.push(`Comment ${comment.id}: ${err.message}`);
                    }
                }

                console.log(`[analyze] Completed reel ${reel.id}`);
            } catch (error) {
                const err = error as Error;
                console.error(`[analyze] Failed for reel ${reel.id}:`, err.message);
                errors.push(`Reel ${reel.id}: ${err.message}`);
            }
        }

        // Analyze posts
        for (const post of posts) {
            if (!post.filepath) {
                console.log(`[analyze] Skipping post ${post.id} - not downloaded`);
                continue;
            }

            try {
                console.log(`[analyze] Processing post ${post.id}`);

                const result = await askOpenai([post.filepath], job.postPrompt);

                await prisma.post.update({
                    where: { id: post.id },
                    data: { analyzeRawText: result.text }
                });

                // Analyze post comments
                for (const comment of post.comments) {
                    try {
                        console.log(`[analyze] Processing comment ${comment.id} for post ${post.id}`);
                        const commentPrompt = `${COMMENT_ANALYSIS_PROMPT}\n\nКомментарий:\n${comment.text}`;
                        const commentResult = await askOpenaiText(commentPrompt);
                        await prisma.comment.update({
                            where: { id: comment.id },
                            data: { analyseRawText: commentResult.text }
                        });
                    } catch (error) {
                        const err = error as Error;
                        console.error(`[analyze] Failed for comment ${comment.id}:`, err.message);
                        errors.push(`Comment ${comment.id}: ${err.message}`);
                    }
                }

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
            if (!story.filepath) {
                console.log(`[analyze] Skipping video story ${story.id} - not downloaded`);
                continue;
            }

            try {
                console.log(`[analyze] Processing video story ${story.id}`);

                const framesDir = path.join(path.dirname(story.filepath), 'frames');

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
            if (!story.filepath) {
                console.log(`[analyze] Skipping image story ${story.id} - not downloaded`);
                continue;
            }

            try {
                console.log(`[analyze] Processing image story ${story.id}`);

                const result = await askOpenai([story.filepath], job.postPrompt);

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

        // Calculate score from analysis
        const score = calculateScore(response.text);
        console.log(`[analyze] Calculated score for job ${job.id}: ${score}`);

        // Validate blogger metrics for red flags
        const redflagReason = validateBloggerMetrics(response.text);
        console.log(`[analyze] Validation result for job ${job.id}: ${redflagReason || 'PASS'}`);

        await prisma.job.update({
            where: { id: job.id },
            data: {
                analyzeRawText: response.text,
                nicknameAnalyseRawText: nicknameResult.text,
                score,
                status: 'completed',
                redflag: redflagReason
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
