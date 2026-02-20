import fs from 'fs';
import path from 'path';
import { selectFrames } from '@/modules/media/domain/select-frames.js';

export function getSelectedFrames(videoPath: string): string[] {
    const framesDir = path.join(path.dirname(videoPath), 'frames');
    if (!fs.existsSync(framesDir)) {
        return [];
    }

    const allFrames = fs.readdirSync(framesDir)
        .filter(file => file.endsWith('.jpg'))
        .sort()
        .map(file => path.join(framesDir, file));

    return selectFrames(allFrames, 10);
}
