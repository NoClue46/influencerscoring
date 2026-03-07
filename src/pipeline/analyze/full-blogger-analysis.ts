import type { Job } from '@/db/types.js';
import { db } from '@/db/index.js';
import { jobs, reelsUrls, posts, stories } from '@/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { DEFAULT_BLOGGER_PROMPT } from '@/ai/prompts/blogger-analysis.prompt.js';
import { analyzeNicknameReputation } from '@/ai/analyze-nickname-reputation.js';
import { checkGenderFromAvatar } from '@/ai/check-gender-from-avatar.js';
import { JOB_STATUS } from '@/shared/job-status.js';
import type { PerItemAnalysis } from '@/ai/prompts/post-analysis.prompt.js';

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

function parseItemAnalysis(rawText: string): PerItemAnalysis | null {
    try {
        return JSON.parse(rawText) as PerItemAnalysis;
    } catch {
        return null;
    }
}

export async function runFullBloggerAnalysis(job: Job): Promise<void> {
    console.log(`[analyze] Starting full analysis aggregation for job ${job.id}`);

    const [analyzedReels, analyzedPosts, analyzedStories] = await Promise.all([
        db.query.reelsUrls.findMany({
            where: eq(reelsUrls.jobId, job.id),
            orderBy: asc(reelsUrls.id),
        }),
        db.query.posts.findMany({
            where: eq(posts.jobId, job.id),
            orderBy: asc(posts.id),
        }),
        db.select().from(stories).where(
            eq(stories.jobId, job.id)
        ).orderBy(asc(stories.id)),
    ]);

    // Filter to only items with analyzeRawText
    const allItems = [
        ...analyzedReels.filter(r => r.analyzeRawText !== null),
        ...analyzedPosts.filter(p => p.analyzeRawText !== null),
        ...analyzedStories.filter(s => s.analyzeRawText !== null),
    ];

    console.log(`[analyze] Found ${allItems.length} analyzed items`);

    // Split by analysis type
    const faceItems: Array<{ index: number; personality: NonNullable<PerItemAnalysis['personality']> }> = [];
    const contentItems: Array<{ index: number; data: PerItemAnalysis }> = [];

    for (let i = 0; i < allItems.length; i++) {
        const parsed = parseItemAnalysis(allItems[i].analyzeRawText!);
        if (!parsed) continue;

        if (parsed.has_blogger_face && parsed.personality) {
            faceItems.push({ index: i, personality: parsed.personality });
        }

        // All items contribute to content section
        contentItems.push({ index: i, data: parsed });
    }

    console.log(`[analyze] Face items: ${faceItems.length}, Total content items: ${contentItems.length}`);

    // Build personality section
    const personalitySection = faceItems.length > 0
        ? faceItems
            .map((item, idx) => `Item #${idx + 1}:\n${JSON.stringify(item.personality)}`)
            .join('\n\n')
        : '(No items with blogger face detected)';

    // Build content section — content is always filled
    const contentSection = contentItems
        .map((item, idx) => {
            return `Item #${idx + 1} (${item.data.analysis_type}):\n${JSON.stringify(item.data.content)}`;
        })
        .join('\n\n');

    // Build comment analyses section
    const commentEntries: string[] = [];
    for (const item of [...analyzedReels, ...analyzedPosts]) {
        if (!item.commentsAnalysisRawText) continue;

        const itemLabel = 'reelsUrl' in item ? `Reel ${item.id}` : `Post ${item.id}`;
        commentEntries.push(`${itemLabel}:\n${item.commentsAnalysisRawText}`);
    }

    const commentSection = commentEntries.length > 0
        ? commentEntries.join('\n\n')
        : '(No analyzed comments available)';

    const aggregatedPrompt = `=== PERSONALITY ANALYSES (${faceItems.length} items with blogger face) ===

${personalitySection}

=== CONTENT ANALYSES (${contentItems.length} total items) ===

${contentSection}

=== COMMENT ANALYSES (${commentEntries.length} items with comments) ===

${commentSection}

=== TASK ===
${DEFAULT_BLOGGER_PROMPT}`;

    let { output: finalAnalysis } = await generateText({
        model: openai('gpt-5-mini'),
        output: Output.object({ schema: bloggerAnalysisSchema }),
        prompt: aggregatedPrompt,
    });

    // Override frequency_of_advertising with caption link detection
    const adScores: number[] = [];
    for (const item of [...analyzedReels, ...analyzedPosts]) {
        const caption = item.caption ?? '';
        const hasLink = /https?:\/\/[^\s]+/.test(caption);
        adScores.push(hasLink ? 100 : 0);
    }

    if (adScores.length > 0) {
        const avgAdScore = Math.round(
            adScores.reduce((sum, s) => sum + s, 0) / adScores.length
        );
        finalAnalysis = {
            ...finalAnalysis,
            frequency_of_advertising: {
                ...finalAnalysis.frequency_of_advertising,
                Score: avgAdScore,
            },
        };
    }

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

    const allCommentErs = [...analyzedReels, ...analyzedPosts]
        .map(item => item.commentEr ?? 0)
        .filter(er => er > 0);
    const avgCommentEr = allCommentErs.length > 0
        ? allCommentErs.reduce((sum, er) => sum + er, 0) / allCommentErs.length
        : null;

    await db.update(jobs).set({
        analyzeRawText: JSON.stringify(finalAnalysis),
        nicknameAnalyseRawText: nicknameRawText,
        score: finalScore,
        avgCommentEr,
        status: JOB_STATUS.COMPLETED,
        redflag: redflagReason,
        isFemale: genderCheck.isFemale,
    }).where(eq(jobs.id, job.id));

    console.log(`[analyze] Completed full analysis for job ${job.id}`);
}
