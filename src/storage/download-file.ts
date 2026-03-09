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
    const hostname = new URL(url).hostname;

    if (options?.maxSize) {
        let head: Response;
        try {
            head = await fetch(url, { method: 'HEAD' });
        } catch (error) {
            throw new Error(`Fetch failed for ${hostname}: ${(error as Error).message}`);
        }
        const size = parseInt(head.headers.get('content-length') ?? '0');
        if (size > options.maxSize) {
            return { skipped: true, reason: `File size ${Math.round(size / 1024 / 1024)}MB exceeds ${Math.round(options.maxSize / 1024 / 1024)}MB limit` };
        }
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let response: Response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(`Fetch failed for ${hostname}: ${(error as Error).message}`);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${hostname}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return { skipped: false };
}
