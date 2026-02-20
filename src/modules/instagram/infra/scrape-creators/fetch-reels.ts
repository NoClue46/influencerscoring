import type { ReelItem, ReelsResponse, PostResponse } from '@/modules/instagram/infra/scrape-creators/types.js';

const BASE_URL = "https://api.scrapecreators.com/s";

export async function fetchReels(handle: string, count: number = 12, ignoreUrls: Set<string> = new Set()) {
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

        const reelUrls = allItems.slice(0, count)
            .map((item) => (`https://www.instagram.com/reel/${item.media.code}`))
            .filter(url => !ignoreUrls.has(url));

        let result: {
            url: string;
            downloadUrl: string;
            commentCount: number;
            viewCount: number;
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
                    commentCount: json.data.xdt_shortcode_media.edge_media_to_parent_comment?.count ?? 0,
                    viewCount: json.data.xdt_shortcode_media.video_view_count ?? 0,
                });
            }
        }

        return result;
    } catch (error) {
        console.error(`failed to fetch ${handle} reels: `, error);
        return [];
    }
}
