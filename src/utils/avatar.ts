import { getAvatarPath } from './paths.js';
import { downloadFile } from './download-file.js';

export async function downloadAvatar(avatarUrl: string, username: string, jobId: string): Promise<string> {
    const avatarPath = getAvatarPath(username, jobId);
    await downloadFile(avatarUrl, avatarPath);
    return avatarPath;
}
