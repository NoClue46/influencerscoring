import Replicate from "replicate";
import fs from "node:fs";
import path from "node:path";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY
})

async function downloadFrame(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download frame: ${response.status}`);
    }

    const fileStream = fs.createWriteStream(outputPath);
    const reader = response.body.getReader();

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        fileStream.write(value);
    }

    fileStream.end();

    return new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

async function downloadVideo(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
    }

    const fileStream = fs.createWriteStream(outputPath);
    const reader = response.body.getReader();

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        fileStream.write(value);
    }

    fileStream.end();

    return new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    });
}

export async function downloadAllVideos(reelsUrls, username) {
    const videosDir = path.join(process.cwd(), 'videos', username);
    fs.mkdirSync(videosDir, {recursive: true});

    const downloadPromises = [];
    const filePaths = [];

    for (let i = 0; i < reelsUrls.length; i++) {
        const filePath = path.join(videosDir, `${i}.mp4`);
        filePaths.push(filePath);

        console.info(`Downloading video ${i}: ${reelsUrls[i]}`);
        downloadPromises.push(downloadVideo(reelsUrls[i], filePath));

        if (i < reelsUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    await Promise.all(downloadPromises);
    console.info(`Downloaded ${filePaths.length} videos to ${videosDir}`);

    return filePaths;
}

export async function videoToFrames(filePath) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.info(`Framing video (attempt ${attempt + 1}/${maxRetries}): ${filePath}`);

            const videoBuffer = fs.readFileSync(filePath);

            const output = await replicate.run(
                "fofr/video-to-frames:ad9374d1b385c86948506b3ad287af9fca23e796685221782d9baa2bc43f14a9",
                {
                    input: {
                        fps: 1,
                        video: videoBuffer,
                        extract_all_frames: false
                    }
                }
            );

            return output.map(o => o.url());
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed for ${filePath}:`, error.message);

            if (attempt < maxRetries - 1) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = baseDelay * Math.pow(2, attempt);
                console.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`All ${maxRetries} attempts failed for ${filePath}. Skipping video.`);
                return null;
            }
        }
    }
}

export async function processVideosToFrames(filePaths) {
    const frameUrls = [];
    const allPromises = [];
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

    for (let i = 0; i < filePaths.length; i++) {
        const stats = fs.statSync(filePaths[i]);

        if (stats.size >= MAX_FILE_SIZE) {
            console.info(`Skipping video ${i}: file size ${(stats.size / (1024 * 1024)).toFixed(2)}MB exceeds 100MB limit`);
            allPromises.push(Promise.resolve(null));
            continue;
        }

        console.info(`Framing video ${i}`);
        allPromises.push(videoToFrames(filePaths[i]));
        if (i < filePaths.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const results = await Promise.all(allPromises);

    // Skip null results (failed videos after retries)
    results.forEach(result => {
        if (result !== null) {
            frameUrls.push(result);
        }
    });

    return frameUrls;
}