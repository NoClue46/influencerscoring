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

export async function videoToFrames(inputFilePath) {
    const output = await replicate.run(
        "fofr/video-to-frames:ad9374d1b385c86948506b3ad287af9fca23e796685221782d9baa2bc43f14a9",
        {
            input: {
                fps: 4,
                video: fs.readFileSync(inputFilePath),
                extract_all_frames: false
            }
        }
    );

    // Ensure result folder exists
    // const resultDir = "./result";
    // if (!fs.existsSync(resultDir)) {
    //     fs.mkdirSync(resultDir, {recursive: true});
    // }

    // // Download all frames
    // for (let i = 0; i < output.length; i++) {
    //     const frameUrl = output[i];
    //     const frameNumber = String(i + 1).padStart(3, '0');
    //     const outputPath = path.join(resultDir, `frame_${frameNumber}.png`);
    //
    //     try {
    //         await downloadFrame(frameUrl, outputPath);
    //         console.info(`Downloaded frame ${i + 1}/${output.length}: ${outputPath}`);
    //     } catch (error) {
    //         console.error(`Failed to download frame ${i + 1}: ${error.message}`);
    //     }
    // }

    return output.map(o => o.url());
}