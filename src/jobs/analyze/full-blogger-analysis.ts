import type { Job } from '@prisma/client';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { DEFAULT_BLOGGER_PROMPT } from '../../constants.js';
import { analyzeNicknameReputation } from '../../utils/nickname-reputation.js';
import { checkGenderFromAvatar } from '../../utils/ai/gender-check.js';

const metricSchema = z.object({
    Score: z.number(),
    Confidence: z.number(),
    Interpretation: z.string(),
});

const bloggerAnalysisSchema = z.object({
    income_level: metricSchema,
    talking_head: metricSchema,
    beauty_alignment: metricSchema,
    low_end_ads_absence: metricSchema,
    pillow_ads_constraint: metricSchema,
    ads_focus_consistency: metricSchema,
    sales_authenticity: metricSchema,
    frequency_of_advertising: metricSchema,
    structured_thinking: metricSchema,
    knowledge_depth: metricSchema,
    age_over_30: metricSchema,
    intelligence: metricSchema,
    personal_values: metricSchema,
    enthusiasm: metricSchema,
    charisma: metricSchema,
    expert_status: metricSchema,
});

type BloggerAnalysis = z.infer<typeof bloggerAnalysisSchema>;

const SCORING_WEIGHTS: Record<
    keyof Pick<
        BloggerAnalysis,
        'structured_thinking' | 'knowledge_depth' | 'intelligence' | 'personal_values' | 'enthusiasm' | 'charisma'
    >,
    number
> = {
    structured_thinking: 10,
    knowledge_depth: 10,
    intelligence: 10,
    personal_values: 30,
    enthusiasm: 10,
    charisma: 30,
};

const REQUIRED_METRICS: Array<
    keyof Pick<
        BloggerAnalysis,
        | 'income_level'
        | 'talking_head'
        | 'beauty_alignment'
        | 'low_end_ads_absence'
        | 'pillow_ads_constraint'
        | 'ads_focus_consistency'
        | 'sales_authenticity'
        | 'frequency_of_advertising'
        | 'expert_status'
    >
> = [
    'income_level',
    'talking_head',
    'beauty_alignment',
    'low_end_ads_absence',
    'pillow_ads_constraint',
    'ads_focus_consistency',
    'sales_authenticity',
    'frequency_of_advertising',
    'expert_status',
];

function calculateScore(analysis: BloggerAnalysis): number {
    let sum = 0;
    for (const [key, weight] of Object.entries(SCORING_WEIGHTS) as Array<[keyof typeof SCORING_WEIGHTS, number]>) {
        sum += (analysis[key].Score || 0) * weight;
    }
    return sum / 100;
}

function validateBloggerMetrics(analysis: BloggerAnalysis): string | null {
    const failedMetrics: string[] = [];

    for (const metric of REQUIRED_METRICS) {
        const score = analysis[metric].Score;

        if (metric === 'frequency_of_advertising') {
            // >= 95 = red flag (слишком много рекламы)
            if (score >= 95) {
                failedMetrics.push(metric);
            }
        } else {
            // < 60 = red flag
            if (score < 60) {
                failedMetrics.push(metric);
            }
        }
    }

    return failedMetrics.length > 0
        ? `Low scores: ${failedMetrics.join(', ')}`
        : null;
}

export async function runFullBloggerAnalysis(job: Job): Promise<void> {
    console.log(`[analyze] Starting full analysis aggregation for job ${job.id}`);

    const [analyzedReels, analyzedPosts, analyzedStories] = await Promise.all([
        prisma.reels.findMany({
            where: {
                jobId: job.id,
                analyzeRawText: { not: null },
            },
            orderBy: { id: 'asc' },
        }),
        prisma.post.findMany({
            where: {
                jobId: job.id,
                analyzeRawText: { not: null },
            },
            orderBy: { id: 'asc' },
        }),
        prisma.story.findMany({
            where: {
                jobId: job.id,
                analyzeRawText: { not: null },
            },
            orderBy: { id: 'asc' },
        }),
    ]);

    const allAnalyzed = [...analyzedReels, ...analyzedPosts, ...analyzedStories];
    console.log(
        `[analyze] Found ${allAnalyzed.length} analyzed items (${analyzedReels.length} reels, ${analyzedPosts.length} posts, ${analyzedStories.length} stories)`
    );

    const itemsSection = allAnalyzed
        .map((item, idx) => `Post #${idx + 1}:\n${item.analyzeRawText ?? ''}`)
        .join('\n\n');

    const aggregatedPrompt = `=== REELS/POSTS ANALYSIS (${allAnalyzed.length} items) ===

${itemsSection}

=== TASK ===
${DEFAULT_BLOGGER_PROMPT}`;

    let { output: finalAnalysis } = await generateText({
        model: openai('gpt-5-mini'),
        output: Output.object({ schema: bloggerAnalysisSchema }),
        prompt: aggregatedPrompt,
    });

    const genderCheck = await checkGenderFromAvatar(job.username, job.id);

    if (genderCheck.isFemale) {
        finalAnalysis = {
            ...finalAnalysis,
            expert_status: {
                ...finalAnalysis.expert_status,
                Score: 100,
            },
        };
    }

    const finalScore = calculateScore(finalAnalysis);
    const redflagReason = validateBloggerMetrics(finalAnalysis);
    console.log(
        `[analyze] Calculated score: ${finalScore}, validation: ${redflagReason || 'PASS'}, isFemale: ${genderCheck.isFemale}`
    );

    console.log(`[analyze] Starting nickname analysis for job ${job.id}`);
    const { rawText: nicknameRawText } = await analyzeNicknameReputation(job.username);

    await prisma.job.update({
        where: { id: job.id },
        data: {
            analyzeRawText: JSON.stringify(finalAnalysis),
            nicknameAnalyseRawText: nicknameRawText,
            score: finalScore,
            status: 'completed',
            redflag: redflagReason,
        },
    });

    console.log(`[analyze] Completed full analysis for job ${job.id}`);
}
