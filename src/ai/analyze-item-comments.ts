import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { COMMENT_ANALYSIS_PROMPT } from '@/ai/prompts/comment-analysis.prompt.js';

const itemCommentsAnalysisSchema = z.object({
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

export async function analyzeItemComments(comments: Array<{ text: string }>): Promise<string | null> {
    const normalizedComments = comments
        .map(({ text }) => text.trim())
        .filter((text) => text.length > 0);

    if (normalizedComments.length === 0) {
        return null;
    }

    const prompt = `${COMMENT_ANALYSIS_PROMPT}\n\nComments:\n${normalizedComments
        .map((text, index) => `${index + 1}. ${text}`)
        .join('\n')}`;

    const { output } = await generateText({
        model: openai('gpt-5-nano'),
        output: Output.object({ schema: itemCommentsAnalysisSchema }),
        prompt,
    });

    return JSON.stringify(output);
}
