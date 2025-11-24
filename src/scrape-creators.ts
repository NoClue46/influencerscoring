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