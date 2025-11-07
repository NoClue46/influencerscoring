import fs from 'fs';
import path from 'path';

/**
 * Downloads frames from URLs to local disk
 * @param {string[][]} frameUrls - Array of arrays of frame URLs
 * @param {string} username - Username for directory structure
 * @returns {Promise<string[][]>} Array of arrays of local file paths
 */
export async function downloadFramesToDisk(frameUrls, username) {
    const localPaths = [];

    for (let videoIndex = 0; videoIndex < frameUrls.length; videoIndex++) {
        const urls = frameUrls[videoIndex];
        const videoPaths = [];

        // Create directory for this video's frames
        const framesDir = path.join('videos', username, `frames-${videoIndex}`);
        fs.mkdirSync(framesDir, { recursive: true });

        console.log(`Downloading ${urls.length} frames for video ${videoIndex}...`);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const filePath = path.join(framesDir, `${i}.jpg`);

            try {
                // Download the frame
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to download frame ${i}: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Save to disk
                fs.writeFileSync(filePath, buffer);
                videoPaths.push(filePath);

                // Log progress every 10 frames
                if ((i + 1) % 10 === 0) {
                    console.log(`  Downloaded ${i + 1}/${urls.length} frames for video ${videoIndex}`);
                }
            } catch (error) {
                console.error(`Error downloading frame ${i} from ${url}:`, error.message);
                throw error;
            }
        }

        console.log(`Completed downloading ${urls.length} frames for video ${videoIndex}`);
        localPaths.push(videoPaths);
    }

    return localPaths;
}
