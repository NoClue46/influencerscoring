import type { HighlightsListResponse, HighlightDetailResponse } from '@/modules/instagram/infra/scrape-creators/types.js';

const BASE_URL = "https://api.scrapecreators.com/s";

export async function fetchStories(handle: string, count: number = 10) {
    try {
        // 1. Fetch highlights list (max 100)
        const ids = await fetchHighlightsList(handle, count);

        if (ids.length === 0) {
            console.warn(`[stories] ${handle}: no highlights returned from API`);
            return [];
        }

        // 2. Fetch detailed info for each highlight and group by highlight
        const highlightsWithStories: Array<{
            id: string;
            downloadUrl: string;
            isVideo: boolean;
        }[]> = [];

        console.info("fetched ", ids.length, " highlights")

        for (const id of ids) {
            try {
                console.info("fetching highlight detail for: ", id)
                const items = await fetchHighlightDetail(id);
                if (items.length > 0) {
                    highlightsWithStories.push(items);
                }
            } catch (error) {
                console.error(`failed to fetch highlight detail for ${id}: `, error);
            }
            if (highlightsWithStories.length > 100) {
                break;
            }
        }

        if (highlightsWithStories.length === 0) {
            return [];
        }

        // 3. Distribute exactly `count` stories evenly across highlights
        const result: Array<{
            id: string;
            downloadUrl: string;
            isVideo: boolean;
        }> = [];

        const numHighlights = highlightsWithStories.length;

        if (numHighlights >= count) {
            // Take 1 story from first `count` highlights
            for (let i = 0; i < count; i++) {
                result.push(highlightsWithStories[i][0]);
            }
        } else {
            // Distribute stories using round-robin
            const baseStoriesPerHighlight = Math.floor(count / numHighlights);
            const extraStories = count % numHighlights;

            let remaining = count;

            // First pass: take base stories from each highlight
            for (let i = 0; i < numHighlights && remaining > 0; i++) {
                const stories = highlightsWithStories[i];
                const toTake = Math.min(
                    baseStoriesPerHighlight + (i < extraStories ? 1 : 0),
                    stories.length
                );

                result.push(...stories.slice(0, toTake));
                remaining -= toTake;
            }

            // Second pass: if we still need more stories (some highlights had insufficient stories)
            if (remaining > 0) {
                for (let i = 0; i < numHighlights && remaining > 0; i++) {
                    const stories = highlightsWithStories[i];
                    const alreadyTaken = Math.min(
                        baseStoriesPerHighlight + (i < extraStories ? 1 : 0),
                        stories.length
                    );
                    const available = stories.length - alreadyTaken;

                    if (available > 0) {
                        const toTake = Math.min(remaining, available);
                        result.push(...stories.slice(alreadyTaken, alreadyTaken + toTake));
                        remaining -= toTake;
                    }
                }
            }
        }

        console.info(`[stories] ${handle}: ${ids.length} highlights found, ${highlightsWithStories.length} with items, ${result.length} stories selected`);
        return result.slice(0, count); // Ensure exactly count stories
    } catch (error) {
        console.error(`failed to fetch ${handle} stories: `, error);
        return [];
    }
}

async function fetchHighlightsList(handle: string, count?: number): Promise<string[]> {
    let url = new URL(BASE_URL);
    url.pathname = `/v1/instagram/user/highlights`;
    url.searchParams.set('handle', handle);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-api-key": process.env.SCRAPE_CREATORS ?? "",
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch highlights ${response.statusText}`);
    }

    const json = await response.json() as HighlightsListResponse;

    const ids = json.highlights.map((h) => h.id);
    return count ? ids.slice(0, count) : ids;
}

async function fetchHighlightDetail(id: string): Promise<{
    id: string;
    downloadUrl: string;
    isVideo: boolean;
}[]> {
    let url = new URL(BASE_URL);
    url.pathname = `/v1/instagram/user/highlight/detail`;
    url.searchParams.set("id", id)

    const highlightsResp = await fetch(url, {
        method: "GET",
        headers: {
            "x-api-key": process.env.SCRAPE_CREATORS!,
        }
    });

    if (!highlightsResp.ok) {
        throw new Error(`Failed to fetch highlight detail ${highlightsResp.statusText}`);
    }

    const json = await highlightsResp.json() as HighlightDetailResponse;

    const result: {
        id: string;
        downloadUrl: string;
        isVideo: boolean;
    }[] = [];

    for (const item of json.items) {
        const isVideo = !!item.video_versions;
        let downloadUrl: string | undefined;

        if (isVideo && item.video_versions?.[0]) {
            downloadUrl = item.video_versions[0].url;
        } else if (item.image_versions2?.candidates?.[0]) {
            downloadUrl = item.image_versions2.candidates[0].url;
        }

        if (downloadUrl) {
            result.push({
                id: id,
                downloadUrl,
                isVideo
            });
        }
    }

    return result;
}
