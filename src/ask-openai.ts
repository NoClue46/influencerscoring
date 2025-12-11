import OpenAI from 'openai';
import fs from 'fs';

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
    const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
    });
    return transcription.text;
}

export async function askOpenaiWithWebSearch(
    prompt: string
): Promise<AskOpenaiResponse> {
    const response = await client.responses.create({
        model: "gpt-5",
        tools: [
            { type: "web_search" }
        ],
        input: prompt,
    });

    return { text: response.output_text ?? null };
}
