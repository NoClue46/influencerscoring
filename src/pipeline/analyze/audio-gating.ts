import type { PerItemAnalysis } from '@/ai/prompts/post-analysis.prompt.js';
import { isMeaningfulTranscription, shouldForceTalkingHeadZero } from '@/shared/audio-analysis.js';

interface BuildPromptWithAudioContextOptions {
    transcription: string | null;
    audioClassification: string | null;
    audioClassificationConfidence: number | null;
}

export function buildPromptWithAudioContext(
    basePrompt: string,
    options: BuildPromptWithAudioContextOptions,
): string {
    const sections = [basePrompt];

    if (options.audioClassification) {
        const confidence = options.audioClassificationConfidence ?? 0;
        sections.push(`Audio classification: ${options.audioClassification} (confidence ${confidence}/100)`);
    }

    if (isMeaningfulTranscription(options.transcription)) {
        sections.push(`Transcription:\n${options.transcription}`);
    }

    return sections.join('\n\n');
}

export function applyTalkingHeadAudioOverride(
    analysis: PerItemAnalysis,
    audioClassification: string | null,
    audioClassificationConfidence: number | null,
): PerItemAnalysis {
    if (!analysis.personality || !shouldForceTalkingHeadZero(audioClassification, audioClassificationConfidence)) {
        return analysis;
    }

    return {
        ...analysis,
        personality: {
            ...analysis.personality,
            talking_head: {
                ...analysis.personality.talking_head,
                Score: 0,
                Confidence: audioClassificationConfidence ?? analysis.personality.talking_head.Confidence,
                Interpretation: `Forced to 0 because audio classification detected ${audioClassification}.`,
            },
        },
    };
}
