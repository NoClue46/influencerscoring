import fs from 'fs';
import path from 'path';

export function encodeImageToDataUri(imagePath: string): string {
    const ext = path.extname(imagePath).slice(1) || 'jpeg';
    const base64 = fs.readFileSync(imagePath).toString('base64');
    return `data:image/${ext};base64,${base64}`;
}
