const BASE_URL = "https://api.scrapecreators.com/s";

interface ReelItem {
    media: {
        code: string;
    };
}

interface PagingInfo {
    max_id?: string;
    more_available?: boolean;
}

interface ReelsResponse {
    items?: ReelItem[];
    paging_info?: PagingInfo;
}

interface PostResponse {
    data?: {
        xdt_shortcode_media?: {
            video_url?: string;
        };
    };
}

export async function fetchReels(handle: string, count: number = 12) {
    try {
        // 1. Fetch reel URLs
        let allItems: ReelItem[] = [];
        let cursor: string | null = null;

        while (allItems.length < count) {
            const url = new URL(BASE_URL);
            url.pathname = `/v1/instagram/user/reels`;
            url.searchParams.set('handle', handle);
            if (cursor) {
                url.searchParams.set('cursor', cursor);
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": process.env.SCRAPE_CREATORS ?? "",
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch reels ${response.statusText}`);
            }

            const json = await response.json() as ReelsResponse;

            if (!json.items || !Array.isArray(json.items)) {
                break;
            }

            allItems.push(...json.items);
            cursor = json.paging_info?.max_id ?? null;

            if (!cursor || !json.paging_info?.more_available) break;
        }

        const reelUrls = allItems.slice(0, count).map((item) => (`https://www.instagram.com/reel/${item.media.code}`));

        let result: {
            url: string;
            downloadUrl: string;
        }[] = [];

        // 2. Fetch every reel detailed info
        for (const reelUrl of reelUrls) {
            const url = new URL(BASE_URL);
            url.pathname = `/v1/instagram/post`;
            url.search = `?url=${encodeURIComponent(reelUrl)}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": process.env.SCRAPE_CREATORS ?? "",
                }
            })

            if (!response.ok) {
                console.error("Response body: ", await response.json());
                throw new Error(`Failed to fetch reels ${response.statusText}`);
            }

            const json = await response.json() as PostResponse;

            if (json.data?.xdt_shortcode_media?.video_url) {
                result.push({
                    url: reelUrl,
                    downloadUrl: json.data.xdt_shortcode_media.video_url,
                });
            }
        }

        return result;
    } catch (error) {
        console.error(`failed to fetch ${handle} reels: `, error);
        return [];
    }
}

export async function fetchPosts(handle: string, count: number = 12) {
    try {
        // 1. Fetch posts urls
        let urls: string[] = []
        let cursor: string | null = null;

        while (urls.length < count) {
            const url = new URL(BASE_URL);
            url.pathname = `/v1/instagram/user/posts`;
            url.searchParams.set('handle', handle);
            if (cursor) {
                url.searchParams.set('cursor', cursor);
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": process.env.SCRAPE_CREATORS ?? "",
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch reels ${response.statusText}`);
            }

            const json = await response.json() as { 
                posts: {
                    node: {
                        url: string
                    }
                }[];
                cursor: string | null;
             };

             urls.push(...json.posts.map(p => p.node.url))
             cursor = json.cursor;

             if (!cursor) break;
        }

        urls = urls.slice(0, count)

        let result: { 
            url: string; 
            downloadUrl: string; 
            isVideo: boolean;
        }[] = [];

        // 2. Fetch every post detailed info
        for (const currentUrl of urls) {
            const url = new URL(BASE_URL);
            url.pathname = `/v1/instagram/post`;
            url.search = `?url=${encodeURIComponent(currentUrl)}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": process.env.SCRAPE_CREATORS ?? "",
                }
            })

            if (!response.ok) {
                console.error("Response body: ", await response.json());
                throw new Error(`Failed to fetch reels ${response.statusText}`);
            }

            const json = await response.json() as {
                data: {
                    xdt_shortcode_media: {
                        display_url: string;
                        is_video: boolean;
                    }
                }
            }

            // todo: возможно в будущем нужно убрать
            if (json.data.xdt_shortcode_media.is_video) {
                continue;
            }

            result.push({
                url: currentUrl,
                downloadUrl: json.data.xdt_shortcode_media.display_url,
                isVideo: json.data.xdt_shortcode_media.is_video
            });
        }

        return result;
    } catch (error) {
        console.error(`failed to fetch ${handle} posts: `, error);
        return [];
    }
}

export async function fetchStories(handle: string, count: number = 10) {
    try {
        // 1. Fetch highlights list (max 100)
        const ids = await fetchHighlightsList(handle, count);

        if (ids.length === 0) {
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
            console.info("fetching highlight detail for: ", id)
            const items = await fetchHighlightDetail(id);
            if (items.length > 0) {
                highlightsWithStories.push(items);
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

    const json = await response.json() as {
        highlights: {
            id: string
        }[]
    }

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
            "x-api-key": process.env.SCRAPE_CREATORS,
        }
    });

    if (!highlightsResp.ok) {
        throw new Error(`Failed to fetch highlight detail ${highlightsResp.statusText}`);
    }

    const json = await highlightsResp.json() as {
        items: {
            video_versions?: {
                url: string
            }[];
            image_versions2?: {
                candidates: {
                    url: string;
                }[]
            }
        }[]
    }

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