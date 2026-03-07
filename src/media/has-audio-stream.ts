import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function hasAudioStream(videoPath: string): Promise<boolean> {
    console.log(`[hasAudioStream] Probing: ${videoPath}`);

    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v',
            'error',
            '-select_streams',
            'a',
            '-show_entries',
            'stream=codec_type',
            '-of',
            'csv=p=0',
            videoPath,
        ]);

        const hasStream = stdout.trim().length > 0;
        console.log(`[hasAudioStream] ${hasStream ? 'Audio stream found' : 'No audio stream'}: ${videoPath}`);
        return hasStream;
    } catch (error) {
        const err = error as Error;
        console.error(`[hasAudioStream] Failed: ${err.message}`);
        throw error;
    }
}
