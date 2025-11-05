
const BASE_URL = "https://api.scrapecreators.com/s";

export async function fetchAllReels(handle) {
    const url = new URL(BASE_URL);
    url.pathname = `/v1/instagram/user/reels`;
    url.search = `?handle=${handle}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-api-key": process.env.SCRAPE_CREATORS,
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch reels ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.items || !Array.isArray(json.items)) {
        return [];
    }
    return json.items.map((item) => (`https://www.instagram.com/reel/${item.media.code}`));
}

export async function fetchReelsUrl(reelsUrl) {
    const url = new URL(BASE_URL);
    url.pathname = `/v1/instagram/post`;
    url.search = `?url=${encodeURIComponent(reelsUrl)}`;

    console.info("url: ", url.toString())

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-api-key": process.env.SCRAPE_CREATORS,
        }
    })

    if (!response.ok) {
        console.error("Response body: ", await response.json());
        throw new Error(`Failed to fetch reels ${response.statusText}`);
    }

    const json = await response.json();

    if (json.data?.xdt_shortcode_media?.video_url) {
        return json.data.xdt_shortcode_media.video_url;
    }

    return null;
}