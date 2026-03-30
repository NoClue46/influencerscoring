import OpenAI from 'openai';
import fs from 'fs';
import { z } from 'zod';
import { AUDIO_CLASSIFICATION, type AudioClassification } from '@/shared/audio-analysis.js';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 180000, // 3 min
    maxRetries: 3,
});

const audioClassificationSchema = z.object({
    classification: z.enum([
        AUDIO_CLASSIFICATION.SPEECH,
        AUDIO_CLASSIFICATION.MUSIC,
        AUDIO_CLASSIFICATION.SILENCE_OR_NOISE,
        AUDIO_CLASSIFICATION.UNCLEAR,
    ]),
    confidence: z.number().min(0).max(100),
});

export interface AudioClassificationResult {
    classification: AudioClassification;
    confidence: number;
}

const AUDIO_CLASSIFICATION_PROMPT = `Classify this audio track into exactly one category.

- speech: any intelligible human speech or narration, even if background music is present. Do not try to identify the speaker. Any human voice counts.
- music: song, singing, lyrics, or instrumental music without spoken commentary.
- silence_or_noise: no meaningful speech or music, only silence, ambience, or noise.
- unclear: you cannot confidently distinguish the audio.

Respond ONLY with a JSON object, no other text:
{"classification": "speech|music|silence_or_noise|unclear", "confidence": 0-100}`;

export async function transcribeAudio(audioPath: string): Promise<string> {
    console.log(`[transcribeAudio] Starting: ${audioPath}`);
    try {
        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });
        console.log(`[transcribeAudio] Success: ${transcription.text.length} chars`);
        return transcription.text;
    } catch (error) {
        const err = error as Error;
        console.error(`[transcribeAudio] Failed: ${err.message}`);
        throw error;
    }
}

export async function classifyAudioContent(audioPath: string): Promise<AudioClassificationResult> {
    console.log(`[classifyAudioContent] Starting: ${audioPath}`);
    try {
        const audioBase64 = fs.readFileSync(audioPath).toString('base64');

        const completion = await client.chat.completions.create({
            model: 'gpt-4o-audio-preview',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: AUDIO_CLASSIFICATION_PROMPT },
                    {
                        type: 'input_audio',
                        input_audio: {
                            data: audioBase64,
                            format: 'mp3',
                        },
                    },
                ],
            }],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Audio classification response was empty');
        }

        const parsed = audioClassificationSchema.parse(JSON.parse(content));
        const result = {
            classification: parsed.classification,
            confidence: Math.round(parsed.confidence),
        };

        console.log(
            `[classifyAudioContent] Success: ${result.classification} (${result.confidence}/100)`
        );
        return result;
    } catch (error) {
        const err = error as Error;
        console.error(`[classifyAudioContent] Failed: ${err.message}`);
        throw error;
    }
}

