import fs from 'fs';

export async function downloadVideo(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) {
        console.error("Response body: ", await response.json());
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fileStream = fs.createWriteStream(outputPath);
    const reader = response.body.getReader();

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        fileStream.write(value);
    }

    fileStream.end();

    return new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
            console.log('Download completed!');
            resolve(outputPath);
        });
        fileStream.on('error', reject);
    });
}