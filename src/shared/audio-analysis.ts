export const AUDIO_CLASSIFICATION = {
    SPEECH: 'speech',
    MUSIC: 'music',
    SILENCE_OR_NOISE: 'silence_or_noise',
    UNCLEAR: 'unclear',
} as const;

export type AudioClassification = (typeof AUDIO_CLASSIFICATION)[keyof typeof AUDIO_CLASSIFICATION];

export const TRANSCRIPTION_SENTINEL = {
    NOT_DOWNLOADED: '[NOT_DOWNLOADED]',
    NO_AUDIO: '[NO_AUDIO]',
} as const;

export const TALKING_HEAD_AUDIO_OVERRIDE_CONFIDENCE = 80;

const TRANSCRIPTION_SENTINELS = new Set<string>(Object.values(TRANSCRIPTION_SENTINEL));

export function hasCompletedAudioProcessing(
    transcription: string | null | undefined,
    audioClassification: string | null | undefined,
): boolean {
    return transcription !== null && transcription !== undefined
        && audioClassification !== null && audioClassification !== undefined;
}

export function isMeaningfulTranscription(transcription: string | null | undefined): transcription is string {
    return typeof transcription === 'string'
        && transcription.trim().length > 0
        && !TRANSCRIPTION_SENTINELS.has(transcription);
}

export function shouldForceTalkingHeadZero(
    audioClassification: string | null | undefined,
    audioClassificationConfidence: number | null | undefined,
): boolean {
    return audioClassificationConfidence !== null
        && audioClassificationConfidence !== undefined
        && audioClassificationConfidence >= TALKING_HEAD_AUDIO_OVERRIDE_CONFIDENCE
        && (
            audioClassification === AUDIO_CLASSIFICATION.MUSIC
            || audioClassification === AUDIO_CLASSIFICATION.SILENCE_OR_NOISE
        );
}
