import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { BIO_AGE_EXTRACTION_PROMPT, bioAgeExtractionSchema } from '@/ai/prompts/bio-age-extraction.prompt.js';

export async function extractAgeFromBio(biography: string): Promise<number | null> {
    const trimmed = biography.trim();
    if (!trimmed) {
        return null;
    }

    const currentYear = new Date().getFullYear();
    const prompt = BIO_AGE_EXTRACTION_PROMPT(trimmed, currentYear);

    const { output } = await generateText({
        model: openai('gpt-5-nano'),
        output: Output.object({ schema: bioAgeExtractionSchema }),
        prompt,
    });

    const age = output?.age ?? null;

    if (age === null || !Number.isFinite(age) || age < 10 || age > 120) {
        return null;
    }

    return Math.round(age);
}
