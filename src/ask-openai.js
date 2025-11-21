import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 180000, // 3 min
    maxRetries: 3,
});

/**
 * Encodes a local image file to base64 data URI
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 encoded data URI
 */
function encodeImageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    return `data:image/jpeg;base64,${base64Image}`;
}

export async function askOpenai(localFilePaths, prompt) {
    // Convert local file paths to base64 data URIs
    const base64Images = localFilePaths.map(filePath => encodeImageToBase64(filePath));

    const response = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt
                    },
                    ...base64Images.map(dataUri => ({
                        type: "image_url",
                        image_url: { url: dataUri }
                    }))
                ]
            },
        ],
    });

    return {
        text: response.choices[0].message.content
    };
}
