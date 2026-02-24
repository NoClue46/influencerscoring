import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { COMMENT_ANALYSIS_PROMPT } from '@/modules/ai/prompts/comment-analysis.prompt.js';
import { db } from '@/infra/db/index.js';
import { comments } from '@/infra/db/schema.js';
import { eq } from 'drizzle-orm';

const commentAnalysisSchema = z.object({
    fakeness_score: z.number().describe('Fakeness level 0-100'),
    fakeness_confidence: z.number().describe('Confidence in fakeness assessment 0-100'),
    overall_score: z.number().describe('Overall assessment 0-100'),
    overall_confidence: z.number().describe('Confidence in overall assessment 0-100'),
    comment_types: z.array(z.object({
        type: z.string().describe('Type of comment'),
        count: z.number().describe('Count of this type'),
        purpose: z.string().describe('Purpose of this comment type'),
    })).describe('Identified comment types'),
    interpretation: z.string().describe('Interpretation and overall assessment'),
});

export async function analyzeComment(comment: { id: number; text: string }): Promise<void> {
    console.log(`[analyze] Processing comment ${comment.id}`);

    const { output } = await generateText({
        model: openai('gpt-5-nano'),
        output: Output.object({ schema: commentAnalysisSchema }),
        prompt: `${COMMENT_ANALYSIS_PROMPT}\n\nComment:\n${comment.text}`,
    });

    await db.update(comments).set({ analyseRawText: JSON.stringify(output) }).where(eq(comments.id, comment.id));
}
