export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, label?: string): Promise<T> {
    let lastError: Error;
    const tag = label ? `[retry:${label}]` : '[retry]';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.warn(`${tag} ${attempt}/${maxRetries} failed: ${(error as Error).message}`)
            lastError = error as Error;
            if (attempt === maxRetries) throw lastError;
            await sleep(1000 * attempt); // 1s, 2s, 3s...
        }
    }
    throw lastError!;
}
