export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`[withRetry] Attempt ${attempt}/${maxRetries} failed: ${error}`)
            lastError = error as Error;
            if (attempt === maxRetries) throw lastError;
            await sleep(1000 * attempt); // 1s, 2s, 3s...
        }
    }
    throw lastError!;
}
