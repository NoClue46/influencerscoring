import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { NICKNAME_ANALYSIS_PROMPT } from '../constants.js';

const nicknameFindingSchema = z.object({
    issue: z.string(),
    source: z.string().optional(),
    severity: z.string().optional(),
});

const nicknameAnalysisSchema = z.object({
    reputation_score: z.number(),
    estimated_age: z.number().nullable(),
    confidence: z.number().optional(),
    summary: z.string().optional(),
    negative_findings: z.array(nicknameFindingSchema).optional(),
    sources: z.array(z.string()).optional(),
    risk_level: z.string().optional(),
});

function normalizeReputationScore(score: number): number {
    if (!Number.isFinite(score)) {
        return 100;
    }

    return Math.min(100, Math.max(0, score));
}

function normalizeEstimatedAge(age: number | null): number | null {
    if (age === null || !Number.isFinite(age)) {
        return null;
    }

    if (age < 10 || age > 120) {
        return null;
    }

    return Math.round(age);
}

export async function analyzeNicknameReputation(username: string): Promise<{
    reputationScore: number;
    estimatedAge: number | null;
    rawText: string | null;
}> {
    const nicknamePrompt = NICKNAME_ANALYSIS_PROMPT(username);

    try {
        const { output } = await generateText({
            model: openai('gpt-5'),
            output: Output.object({ schema: nicknameAnalysisSchema }),
            prompt: nicknamePrompt,
            tools: {
                web_search: openai.tools.webSearch({
                    externalWebAccess: true,
                    searchContextSize: 'high',
                }),
            },
            toolChoice: { type: 'tool', toolName: 'web_search' },
        });

        return {
            reputationScore: normalizeReputationScore(output.reputation_score),
            estimatedAge: normalizeEstimatedAge(output.estimated_age),
            rawText: JSON.stringify(output, null, 2),
        };
    } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
            console.warn(`[nickname-reputation] Failed to generate structured output, using default`);
            return {
                reputationScore: 100,
                estimatedAge: null,
                rawText: error.text ?? null,
            };
        }

        throw error;
    }
}
