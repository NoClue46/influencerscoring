import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 180000, // 3 min
    maxRetries: 3,
});

export async function askOpenai(links) {
    const response = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Based on video frames, score the data by next parameters

1. Blogger's income level
2. Whether the blogger is over 30 years old
3. Depth of knowledge / usefulness
4. Blogger's intelligence
5. What is being advertised and how often
6. Whether it is a talking-head video or not

Return two numbers for each parameter:

1. Parameter score on a 100-point scale
2. Confidence in the accuracy of this parameter's score on a 100-point scale`
                    },
                    ...links.map(l => ({
                        type: "image_url",
                        image_url: { url: l }
                    }))
                ]
            },
        ],
        max_tokens: 4096,
    });

    return {
        text: response.choices[0].message.content
    };
}

export async function processFramesWithOpenAI(frameUrls) {
    const promises = frameUrls.map((frameUrl, index) => {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const res = await askOpenai(frameUrl);
                    resolve(res);
                } catch (error) {
                    reject(error);
                }
            }, index * 2000);
        });
    });

    return Promise.all(promises);
}
