/**
 * Selects evenly distributed frames from an array
 * @param frames - Array of frame paths
 * @param count - Number of frames to select (default: 10)
 * @returns Selected frame paths
 */
export function selectFrames(frames: string[], count: number = 10): string[] {
    if (frames.length <= count) return frames;

    const step = frames.length / count;
    const selected: string[] = [];
    for (let i = 0; i < count; i++) {
        selected.push(frames[Math.floor(i * step)]);
    }
    return selected;
}
