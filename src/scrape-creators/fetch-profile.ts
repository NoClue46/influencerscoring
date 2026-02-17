import type { ProfileUser, ProfileResponse } from './types.js';

export async function fetchProfile(handle: string, trim?: boolean): Promise<ProfileUser | null> {
    try {
        const url = new URL("https://api.scrapecreators.com/v1/instagram/profile");
        url.searchParams.set('handle', handle);
        if (trim) {
            url.searchParams.set('trim', 'true');
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": process.env.SCRAPE_CREATORS ?? "",
            }
        });

        if (!response.ok) {
            console.error("Response body: ", await response.json());
            throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }

        const json = await response.json() as ProfileResponse;

        if (!json.success || !json.data?.user) {
            return null;
        }

        return json.data.user;
    } catch (error) {
        console.error(`failed to fetch profile for ${handle}: `, error);
        return null;
    }
}
