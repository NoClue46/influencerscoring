import path from 'path';

export function getJobBasePath(username: string, jobId: string): string {
    return path.join(process.env.DATA_PATH!, username, jobId);
}

export function getAvatarPath(username: string, jobId: string): string {
    return path.join(getJobBasePath(username, jobId), 'avatar.jpg');
}

export function getItemPath(username: string, jobId: string, itemId: string, filename: string): string {
    return path.join(getJobBasePath(username, jobId), itemId, filename);
}
