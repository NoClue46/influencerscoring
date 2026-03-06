interface HikerStoryResponse {
    pk: string;
    id: string;
    code: string;
    taken_at: number;
    media_type: number; // 1 = photo, 2 = video
    video_url?: string;
    thumbnail_url?: string;
    video_duration?: number;
}

const BASE_URL = "https://api.hikerapi.com";

export async function fetchStoriesFromHikerApi(username: string, count?: number): Promise<{
    id: string;
    downloadUrl: string;
    isVideo: boolean;
}[]> {
    try {
        const url = new URL(`${BASE_URL}/v1/user/stories/by/username`);
        url.searchParams.set("username", username);
        if (count) {
            url.searchParams.set("amount", String(count));
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-access-key": process.env.HIKER_API_KEY ?? "",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch stories from HikerAPI: ${response.statusText}`);
        }

        const stories = (await response.json()) as HikerStoryResponse[];

        return stories
            .map((story) => {
                const isVideo = story.media_type === 2;
                const downloadUrl = isVideo ? story.video_url : story.thumbnail_url;

                if (!downloadUrl) return null;

                return {
                    id: String(story.pk),
                    downloadUrl,
                    isVideo,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
    } catch (error) {
        console.error(`failed to fetch ${username} stories from HikerAPI: `, error);
        return [];
    }
}
