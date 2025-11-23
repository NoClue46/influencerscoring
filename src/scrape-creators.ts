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

export async function fetchAllReels(handle: string, count: number = 12): Promise<string[]> {
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

    return allItems.slice(0, count).map((item) => (`https://www.instagram.com/reel/${item.media.code}`));
}

export async function fetchReelsUrl(reelsUrl: string): Promise<string | null> {
    const url = new URL(BASE_URL);
    url.pathname = `/v1/instagram/post`;
    url.search = `?url=${encodeURIComponent(reelsUrl)}`;

    console.info("url: ", url.toString())

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
        return json.data.xdt_shortcode_media.video_url;
    }

    return null;
}
