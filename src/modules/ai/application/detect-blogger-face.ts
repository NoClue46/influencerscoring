import fs from 'fs';
import { askOpenai } from '@/modules/ai/infra/openai-gateway.js';
import { BLOGGER_FACE_MATCH_PROMPT } from '@/modules/ai/prompts/blogger-face-match.prompt.js';

const MIN_CONFIDENCE = 70;
const VIDEO_MATCH_RATIO_THRESHOLD = 0.3;

interface FaceMatchResult {
    samePerson: boolean;
    confidence: number;
}

function parseFaceMatchResult(rawText: string | null): FaceMatchResult | null {
    if (!rawText) return null;

    try {
        const directParsed = JSON.parse(rawText) as { same_person?: unknown; confidence?: unknown };
        if (typeof directParsed.same_person === 'boolean' && typeof directParsed.confidence === 'number') {
            return {
                samePerson: directParsed.same_person,
                confidence: Math.max(0, Math.min(100, directParsed.confidence))
            };
        }
    } catch {
        // fallback below
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
        const parsed = JSON.parse(jsonMatch[0]) as { same_person?: unknown; confidence?: unknown };
        if (typeof parsed.same_person !== 'boolean' || typeof parsed.confidence !== 'number') {
            return null;
        }

        return {
            samePerson: parsed.same_person,
            confidence: Math.max(0, Math.min(100, parsed.confidence))
        };
    } catch {
        return null;
    }
}

async function detectFrameMatch(avatarPath: string, candidateImagePath: string): Promise<boolean> {
    if (!fs.existsSync(avatarPath) || !fs.existsSync(candidateImagePath)) {
        return false;
    }

    const response = await askOpenai([avatarPath, candidateImagePath], BLOGGER_FACE_MATCH_PROMPT);
    const parsed = parseFaceMatchResult(response.text);

    if (!parsed) {
        return false;
    }

    return parsed.samePerson && parsed.confidence >= MIN_CONFIDENCE;
}

export async function detectInImage(avatarPath: string, imagePath: string): Promise<boolean> {
    try {
        return await detectFrameMatch(avatarPath, imagePath);
    } catch (error) {
        const err = error as Error;
        console.warn(`[detect-blogger-face] Failed image detection for ${imagePath}: ${err.message}`);
        return false;
    }
}

export async function detectInVideoFrames(avatarPath: string, framePaths: string[]): Promise<boolean> {
    if (!fs.existsSync(avatarPath)) {
        return false;
    }

    if (framePaths.length === 0) {
        return false;
    }

    let matchedFrames = 0;
    let totalFrames = 0;

    for (const framePath of framePaths) {
        if (!fs.existsSync(framePath)) continue;

        totalFrames++;
        try {
            const isMatch = await detectFrameMatch(avatarPath, framePath);
            if (isMatch) {
                matchedFrames++;
            }
        } catch (error) {
            const err = error as Error;
            console.warn(`[detect-blogger-face] Failed frame detection for ${framePath}: ${err.message}`);
        }
    }

    if (totalFrames === 0) {
        return false;
    }

    return (matchedFrames / totalFrames) >= VIDEO_MATCH_RATIO_THRESHOLD;
}
