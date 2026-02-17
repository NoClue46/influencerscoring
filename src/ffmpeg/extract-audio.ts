import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    console.log(`[extractAudio] Starting: ${videoPath} -> ${audioPath}`);
    try {
        await execAsync(`ffmpeg -y -i "${videoPath}" -vn -acodec mp3 "${audioPath}"`);
        console.log(`[extractAudio] Success: ${audioPath}`);
    } catch (error) {
        const err = error as Error;
        console.error(`[extractAudio] Failed: ${err.message}`);
        throw error;
    }
}
