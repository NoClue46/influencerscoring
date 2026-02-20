import type { Job } from '@/infra/db/types.js';
import { db } from '@/infra/db/index.js';
import { jobs, reelsUrls, posts, stories } from '@/infra/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { DEFAULT_BLOGGER_PROMPT } from '@/modules/ai/prompts/blogger-analysis.prompt.js';
import { analyzeNicknameReputation } from '@/modules/ai/application/analyze-nickname-reputation.js';
import { checkGenderFromAvatar } from '@/modules/ai/application/check-gender-from-avatar.js';
import { JOB_STATUS } from '@/shared/types/job-status.js';

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
            // >= 95 = red flag (too much ads)
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
        db.select().from(reelsUrls).where(
            eq(reelsUrls.jobId, job.id)
        ).orderBy(asc(reelsUrls.id)),
        db.select().from(posts).where(
            eq(posts.jobId, job.id)
        ).orderBy(asc(posts.id)),
        db.select().from(stories).where(
            eq(stories.jobId, job.id)
        ).orderBy(asc(stories.id)),
    ]);

    // Filter to only items with analyzeRawText
    const filteredReels = analyzedReels.filter(r => r.analyzeRawText !== null);
    const filteredPosts = analyzedPosts.filter(p => p.analyzeRawText !== null);
    const filteredStories = analyzedStories.filter(s => s.analyzeRawText !== null);

    const allAnalyzed = [...filteredReels, ...filteredPosts, ...filteredStories];
    console.log(
        `[analyze] Found ${allAnalyzed.length} analyzed items (${filteredReels.length} reels, ${filteredPosts.length} posts, ${filteredStories.length} stories)`
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

    await db.update(jobs).set({
        analyzeRawText: JSON.stringify(finalAnalysis),
        nicknameAnalyseRawText: nicknameRawText,
        score: finalScore,
        status: JOB_STATUS.COMPLETED,
        redflag: redflagReason,
    }).where(eq(jobs.id, job.id));

    console.log(`[analyze] Completed full analysis for job ${job.id}`);
}
