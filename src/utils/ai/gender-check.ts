import fs from 'fs';
import path from 'path';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getAvatarPath } from '../paths.js';

const genderAnalysisSchema = z.object({
    gender: z.object({
        Score: z.number().describe('0 = Male, 100 = Female'),
        Confidence: z.number().describe('Assessment reliability 0-100'),
        Interpretation: z.string().describe('Why this score was assigned'),
    }),
});

export function overrideExpertStatusForFemale(analysisJson: string): string {
    try {
        const data = JSON.parse(analysisJson);
        data.expert_status = { ...data.expert_status, Score: 100 };
        return JSON.stringify(data);
    } catch {
        return analysisJson;
    }
}

export async function checkGenderFromAvatar(
    username: string,
    jobId: string
): Promise<{ isFemale: boolean; score: number | null }> {
    console.log(`[analyze] Checking gender from avatar for ${username}`);

    const avatarPath = getAvatarPath(username, jobId);
    if (!fs.existsSync(avatarPath)) {
        console.log(`[analyze] Avatar not found at ${avatarPath}`);
        return { isFemale: false, score: null };
    }

    const ext = path.extname(avatarPath).slice(1) || 'jpeg';
    const base64 = fs.readFileSync(avatarPath).toString('base64');
    const dataUri = `data:image/${ext};base64,${base64}`;

    const { output } = await generateText({
        model: openai('gpt-5-mini'),
        output: Output.object({ schema: genderAnalysisSchema }),
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        image: dataUri,
                    },
                    {
                        type: 'text',
                        text: 'Analyze the provided photo and determine the gender of the person. Score 0 = Male, 100 = Female.',
                    },
                ],
            },
        ],
    });

    const score = output?.gender.Score ?? null;

    // score >= 50 означает женщина
    const isFemale = score !== null && score >= 50;
    console.log(`[analyze] Gender score: ${score}, isFemale: ${isFemale}`);

    return { isFemale, score };
}
