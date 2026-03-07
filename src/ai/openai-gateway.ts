import OpenAI from 'openai';
import fs from 'fs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { AUDIO_CLASSIFICATION, type AudioClassification } from '@/shared/audio-analysis.js';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 180000, // 3 min
    maxRetries: 3,
});

/**
 * Encodes a local image file to base64 data URI
 * @param imagePath - Path to the image file
 * @returns Base64 encoded data URI
 */
function encodeImageToBase64(imagePath: string): string {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    return `data:image/jpeg;base64,${base64Image}`;
}

interface AskOpenaiResponse {
    text: string | null;
}

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

Return JSON with:
- classification: one of speech, music, silence_or_noise, unclear
- confidence: integer 0-100`;

export async function askOpenai(
    localFilePaths: string[],
    prompt: string
): Promise<AskOpenaiResponse> {
    // Convert local file paths to base64 data URIs
    const base64Images = localFilePaths.map(filePath => encodeImageToBase64(filePath));

    const response = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt
                    },
                    ...base64Images.map(dataUri => ({
                        type: "image_url" as const,
                        image_url: { url: dataUri }
                    }))
                ]
            },
        ],
    });

    return {
        text: response.choices[0]?.message?.content ?? null
    };
}

/**
 * Sends text-only request to OpenAI
 * @param prompt - Text prompt
 * @returns Response text
 */
export async function askOpenaiText(
    prompt: string
): Promise<AskOpenaiResponse> {
    const response = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "user",
                content: prompt
            },
        ],
    });

    return {
        text: response.choices[0]?.message?.content ?? null
    };
}

/**
 * Transcribes audio file using OpenAI Whisper
 * @param audioPath - Path to audio file (mp3, mp4, etc)
 * @returns Transcribed text
 */
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

        const completion = await client.beta.chat.completions.parse({
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
            response_format: zodResponseFormat(audioClassificationSchema, 'audio_classification'),
        });

        const parsed = completion.choices[0]?.message?.parsed;
        if (!parsed) {
            throw new Error('Audio classification response was empty');
        }

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

export async function askOpenaiWithWebSearch(
    prompt: string
): Promise<AskOpenaiResponse> {
    const response = await client.responses.create({
        model: "gpt-5",
        tools: [
            { type: "web_search_preview" }
        ],
        input: prompt,
    });

    return { text: response.output_text ?? null };
}
