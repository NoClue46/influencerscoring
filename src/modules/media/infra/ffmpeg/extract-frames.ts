import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function extractFrames(videoPath: string, framesDir: string): Promise<void> {
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }
    const outputPattern = path.join(framesDir, 'frame_%04d.jpg');
    await execAsync(`ffmpeg -i "${videoPath}" -vf "fps=1" "${outputPattern}"`);
}
