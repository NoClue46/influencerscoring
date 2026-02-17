import type { Comment, CommentsResponse } from './types.js';

const BASE_URL = "https://api.scrapecreators.com/s";

export async function fetchComments(postUrl: string, amount: number = 105): Promise<Comment[]> {
    try {
        const url = new URL(BASE_URL);
        url.pathname = `/v1/instagram/post/comments`;
        url.searchParams.set('url', postUrl);
        if (amount !== 105) {
            url.searchParams.set('amount', amount.toString());
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": process.env.SCRAPE_CREATORS ?? "",
            }
        });

        if (!response.ok) {
            console.error("Response body: ", await response.json());
            throw new Error(`Failed to fetch comments ${response.statusText}`);
        }

        const json = await response.json() as CommentsResponse;

        if (!json.success || !json.comments) {
            return [];
        }

        return json.comments.slice(0, amount);
    } catch (error) {
        console.error(`failed to fetch comments for ${postUrl}: `, error);
        return [];
    }
}
