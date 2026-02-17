import type { PostsListResponse } from './types.js';

const BASE_URL = "https://api.scrapecreators.com/s";

export async function fetchPosts(handle: string, count: number = 12, ignoreUrls: Set<string> = new Set()) {
    console.log(`[fetchPosts] starting for @${handle}, limit: ${count}`);
    try {
        let result: {
            url: string;
            downloadUrl: string;
            isVideo: boolean;
            commentCount: number;
            viewCount: number;
        }[] = [];
        let cursor: string | null = null;
        const processedCodes = new Set<string>();
        let pageNum = 0;
        let skippedCount = 0;

        while (result.length < count) {
            pageNum++;
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
                throw new Error(`Failed to fetch posts ${response.statusText}`);
            }

            const json = await response.json() as PostsListResponse;

            if (!json.posts || json.posts.length === 0) break;
            console.log(`[fetchPosts] page ${pageNum}: fetched ${json.posts.length} items`);

            for (const item of json.posts) {
                if (result.length >= count) break;
                const node = item.node;
                if (processedCodes.has(node.shortcode)) continue;
                processedCodes.add(node.shortcode);

                // Skip videos and carousels (GraphSidecar), only photos
                if (node.is_video || node.__typename === 'GraphSidecar') {
                    skippedCount++;
                    if (skippedCount >= 100) {
                        console.log(`[fetchPosts] skipped 100 posts, returning ${result.length} photos`);
                        break;
                    }
                    continue;
                }

                const postUrl = `https://www.instagram.com/p/${node.shortcode}`;

                if (ignoreUrls.has(postUrl)) continue;

                // Use data from list response directly (optimization)
                result.push({
                    url: postUrl,
                    downloadUrl: node.display_url,
                    isVideo: false,
                    commentCount: node.edge_media_to_comment?.count ?? 0,
                    viewCount: node.video_view_count ?? 0,
                });
            }

            if (skippedCount >= 100) break;

            cursor = json.cursor ?? null;
            if (!cursor) break;
        }

        console.log(`[fetchPosts] completed: ${result.length} photos for @${handle} (skipped: ${skippedCount})`);
        return result;
    } catch (error) {
        console.error(`failed to fetch ${handle} posts: `, error);
        return [];
    }
}
