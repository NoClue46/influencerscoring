import { CronJob } from 'cron';
import { prisma } from '../prisma.js';
import { askOpenaiText } from '../ask-openai.js';

export const processFullAnalyzeJob = new CronJob('*/5 * * * * *', async () => {
    const job = await prisma.job.findFirst({
        where: { status: 'full-analyze' }
    });

    if (!job) return;

    const reelsWithAnalysis = await prisma.reels.findMany({
        where: {
            jobId: job.id,
            analyzeRawText: { not: null }
        },
        orderBy: { id: 'asc' }
    });

    console.log(`Job ${job.id}: found ${reelsWithAnalysis.length} reels with analyzeRawText`);

    // Build structured prompt
    const reelsSection = reelsWithAnalysis
        .map((reel, idx) => `Post #${idx + 1}:\n${reel.analyzeRawText}`)
        .join('\n\n');

    const prompt = `=== REELS ANALYSIS (${reelsWithAnalysis.length} posts) ===

${reelsSection}

=== TASK ===
${job.bloggerPrompt || 'Analyze posts above'}`;

    try {
        const response = await askOpenaiText(prompt);

        if (!response.text) {
            throw new Error('Empty response from OpenAI');
        }

        await prisma.job.update({
            where: { id: job.id },
            data: {
                analyzeRawText: response.text,
                status: 'completed',
                completedAt: new Date()
            }
        });

        console.log(`Job ${job.id}: completed full analysis`);
    } catch (error) {
        console.error(`Job ${job.id}: full-analyze error:`, error);

        const newAttempts = job.attempts + 1;

        if (newAttempts >= 5) {
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    reason: 'Max attempts reached (5)',
                    attempts: newAttempts
                }
            });
            console.log(`Job ${job.id}: marked as failed after ${newAttempts} attempts`);
        } else {
            await prisma.job.update({
                where: { id: job.id },
                data: { attempts: newAttempts }
            });
            console.log(`Job ${job.id}: attempt ${newAttempts}/5, will retry`);
        }
    }
});
