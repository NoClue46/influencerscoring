import fs from 'fs';
import path from 'path';

export interface DownloadFileResult {
    skipped: boolean;
    reason?: string;
}

export async function downloadFile(
    url: string,
    destPath: string,
    options?: { maxSize?: number }
): Promise<DownloadFileResult> {
    if (options?.maxSize) {
        const head = await fetch(url, { method: 'HEAD' });
        const size = parseInt(head.headers.get('content-length') ?? '0');
        if (size > options.maxSize) {
            return { skipped: true, reason: `File size ${Math.round(size / 1024 / 1024)}MB exceeds ${Math.round(options.maxSize / 1024 / 1024)}MB limit` };
        }
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return { skipped: false };
}
