import { NICKNAME_ANALYSIS_PROMPT } from '../constants.js';
import { askOpenaiWithWebSearch } from '../ask-openai.js';

export async function analyzeNicknameReputation(username: string): Promise<{
    reputationScore: number;
    estimatedAge: number | null;
    rawText: string | null;
}> {
    const nicknamePrompt = NICKNAME_ANALYSIS_PROMPT(username);
    const nicknameResult = await askOpenaiWithWebSearch(nicknamePrompt);

    let reputationScore = 100;
    let estimatedAge: number | null = null;
    try {
        if (nicknameResult.text) {
            const jsonMatch = nicknameResult.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                reputationScore = parsed.reputation_score ?? 100;
                estimatedAge = parsed.estimated_age ?? null;
            }
        }
    } catch (e) {
        console.warn(`[nickname-reputation] Failed to parse reputation score, using default`);
    }

    return { reputationScore, estimatedAge, rawText: nicknameResult.text ?? null };
}
