import fs from 'fs';
import path from 'path';
import { getAvatarPath } from './paths.js';

export async function downloadAvatar(avatarUrl: string, username: string, jobId: string): Promise<string> {
    const avatarPath = getAvatarPath(username, jobId);
    const avatarDir = path.dirname(avatarPath);

    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }

    const response = await fetch(avatarUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(avatarPath, buffer);

    return avatarPath;
}
