import { prisma } from '../../prisma.js';
import { askOpenai } from '../../ask-openai.js';
import { analyzeComment } from '../../utils/ai/analyze-comment.js';
import { selectFrames } from '../../utils/select-frames.js';
import type { Reels, Comment } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export async function analyzeReels(
    reels: (Reels & { comments: Comment[] })[],
    postPrompt: string
): Promise<string[]> {
    const errors: string[] = [];

    for (const reel of reels) {
        if (!reel.filepath) {
            console.log(`[analyze] Skipping reel ${reel.id} - not downloaded`);
            continue;
        }

        try {
            console.log(`[analyze] Processing reel ${reel.id}`);

            const framesDir = path.join(path.dirname(reel.filepath), 'frames');

            const allFrames = fs.readdirSync(framesDir)
                .filter(f => f.endsWith('.jpg'))
                .sort()
                .map(f => path.join(framesDir, f));

            const selectedFrames = selectFrames(allFrames, 10);
            const promptWithTranscription = reel.transcription
                ? `${postPrompt}\n\nTranscription:\n${reel.transcription}`
                : postPrompt;
            const result = await askOpenai(selectedFrames, promptWithTranscription);

            await prisma.reels.update({
                where: { id: reel.id },
                data: { analyzeRawText: result.text }
            });

            // Analyze reel comments
            for (const comment of reel.comments) {
                try {
                    await analyzeComment(comment);
                } catch (error) {
                    const err = error as Error;
                    console.error(`[analyze] Failed for comment ${comment.id}:`, err.message);
                    errors.push(`Comment ${comment.id}: ${err.message}`);
                }
            }

            console.log(`[analyze] Completed reel ${reel.id}`);
        } catch (error) {
            const err = error as Error;
            console.error(`[analyze] Failed for reel ${reel.id}:`, err.message);
            errors.push(`Reel ${reel.id}: ${err.message}`);
        }
    }

    return errors;
}
